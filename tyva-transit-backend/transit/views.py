import re

from django.db import transaction
from django.db.models import F
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, Destination, Trip
from .serializers import (
    BookingLookupSerializer,
    BookingSerializer,
    DestinationSerializer,
    PrivateBookingCreateSerializer,
    SharedBookingCreateSerializer,
    TripSerializer,
    estimate_private_amount,
)
from .services.email_service import send_ticket_email
from .services.payment import process_stub_payment


def normalize_phone(phone: str) -> str:
    return re.sub(r'\D', '', phone or '')


class DestinationListView(APIView):
    def get(self, request):
        qs = Destination.objects.filter(is_active=True)
        return Response(DestinationSerializer(qs, many=True).data)


class TripListView(APIView):
    def get(self, request):
        qs = Trip.objects.filter(is_active=True).select_related('destination')
        destination_param = request.query_params.get('destination') or request.query_params.get('lake')
        date_from = request.query_params.get('date_from')
        available_only = request.query_params.get('available_only', 'yes')

        if destination_param:
            if str(destination_param).isdigit():
                qs = qs.filter(destination_id=destination_param)
            else:
                qs = qs.filter(destination__slug=destination_param)
        if date_from:
            qs = qs.filter(departure_at__date__gte=date_from)
        if available_only == 'yes':
            qs = qs.filter(seats_booked__lt=F('seats_total'))

        return Response(TripSerializer(qs, many=True).data)


class TripDetailView(APIView):
    def get(self, request, trip_id):
        try:
            trip = Trip.objects.select_related('destination').get(pk=trip_id, is_active=True)
        except Trip.DoesNotExist:
            return Response({'detail': 'Рейс не найден'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TripSerializer(trip).data)


class SharedBookingCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = SharedBookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            trip = Trip.objects.select_for_update().select_related('destination').get(
                pk=data['trip_id'], is_active=True,
            )
        except Trip.DoesNotExist:
            return Response({'detail': 'Рейс не найден'}, status=status.HTTP_404_NOT_FOUND)

        if trip.seats_available < data['seats']:
            return Response({'detail': 'Недостаточно свободных мест'}, status=status.HTTP_400_BAD_REQUEST)

        total = trip.price_per_seat * data['seats']
        booking = Booking.objects.create(
            booking_type=Booking.BookingType.SHARED,
            status=Booking.Status.PENDING,
            trip=trip,
            destination=trip.destination,
            customer_name=data['customer_name'],
            phone=data['phone'],
            email=data['email'],
            seats=data['seats'],
            payment_method=data['payment_method'],
            total_amount=total,
        )

        payment = process_stub_payment(booking)
        booking.status = Booking.Status.PAID
        booking.save(update_fields=['status'])

        trip.seats_booked = F('seats_booked') + data['seats']
        trip.save(update_fields=['seats_booked'])
        trip.refresh_from_db()

        email_sent = False
        email_error = ''
        try:
            send_ticket_email(booking)
            email_sent = True
        except Exception as exc:
            email_error = str(exc)

        return Response(
            {
                'booking': BookingSerializer(booking).data,
                'payment': payment,
                'email_sent': email_sent,
                'email_error': email_error,
            },
            status=status.HTTP_201_CREATED,
        )


class PrivateBookingCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PrivateBookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            destination = Destination.objects.get(pk=data['destination_id'], is_active=True)
        except Destination.DoesNotExist:
            return Response({'detail': 'Направление не найдено'}, status=status.HTTP_404_NOT_FOUND)

        total = estimate_private_amount(data['seats'], data['vehicle_type'], data['round_trip'])
        booking = Booking.objects.create(
            booking_type=Booking.BookingType.PRIVATE,
            status=Booking.Status.PENDING,
            destination=destination,
            departure_date=data['departure_date'],
            departure_time=data.get('departure_time', ''),
            return_date=data.get('return_date'),
            round_trip=data['round_trip'],
            vehicle_type=data['vehicle_type'],
            seats=data['seats'],
            customer_name=data['customer_name'],
            phone=data['phone'],
            email=data['email'],
            comment=data.get('comment', ''),
            total_amount=total,
        )

        email_sent = False
        email_error = ''
        try:
            send_ticket_email(booking)
            email_sent = True
        except Exception as exc:
            email_error = str(exc)

        return Response(
            {
                'booking': BookingSerializer(booking).data,
                'email_sent': email_sent,
                'email_error': email_error,
            },
            status=status.HTTP_201_CREATED,
        )


class BookingLookupView(APIView):
    def get(self, request):
        serializer = BookingLookupSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code'].strip().upper()
        phone = normalize_phone(serializer.validated_data['phone'])

        try:
            booking = Booking.objects.select_related('destination', 'trip').get(code__iexact=code)
        except Booking.DoesNotExist:
            return Response({'detail': 'Билет не найден'}, status=status.HTTP_404_NOT_FOUND)

        if normalize_phone(booking.phone) != phone:
            return Response({'detail': 'Телефон не совпадает'}, status=status.HTTP_404_NOT_FOUND)

        return Response(BookingSerializer(booking).data)
