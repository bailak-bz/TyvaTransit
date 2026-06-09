from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .api_base import CsrfExemptAPIView
from .auth_serializers import LoginSerializer, ProfileUpdateSerializer, RegisterSerializer, UserSerializer
from .models import Booking, UserProfile
from .serializers import BookingSerializer
from .services.email_service import send_ticket_email
from .services.payment import process_stub_payment
from .services.user_service import link_bookings_to_user


class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class RegisterView(CsrfExemptAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        link_bookings_to_user(user)
        login(request, user)
        return Response(UserSerializer.from_user(user), status=status.HTTP_201_CREATED)


class LoginView(CsrfExemptAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']

        user = User.objects.filter(email__iexact=email).first()
        if user is None or not user.check_password(password):
            return Response({'detail': 'Неверный email или пароль.'}, status=status.HTTP_400_BAD_REQUEST)

        login(request, user)
        link_bookings_to_user(user)
        return Response(UserSerializer.from_user(user))


class LogoutView(CsrfExemptAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'detail': 'ok'})


class MeView(CsrfExemptAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer.from_user(request.user))

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        data = serializer.validated_data
        if 'display_name' in data:
            profile.display_name = data['display_name'].strip()
        if 'phone' in data:
            profile.phone = data['phone'].strip()
        profile.save()
        link_bookings_to_user(request.user)
        return Response(UserSerializer.from_user(request.user))


class MyBookingsView(CsrfExemptAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = (
            Booking.objects.filter(user=request.user)
            .select_related('destination', 'trip')
            .order_by('-created_at')
        )
        active = []
        history = []
        for booking in bookings:
            data = BookingSerializer(booking).data
            data['is_upcoming'] = booking.is_upcoming
            if booking.is_upcoming:
                active.append(data)
            else:
                history.append(data)
        return Response({'active': active, 'history': history})


class PayPrivateBookingView(CsrfExemptAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.select_related('destination', 'trip').get(
                pk=booking_id,
                user=request.user,
            )
        except Booking.DoesNotExist:
            return Response({'detail': 'Бронь не найдена'}, status=status.HTTP_404_NOT_FOUND)

        if not booking.needs_payment:
            return Response({'detail': 'Оплата для этой брони недоступна'}, status=status.HTTP_400_BAD_REQUEST)

        payment = process_stub_payment(booking)
        booking.status = Booking.Status.PAID
        booking.save(update_fields=['status'])

        email_sent = False
        email_error = ''
        try:
            send_ticket_email(booking)
            email_sent = True
        except Exception as exc:
            email_error = str(exc)

        return Response({
            'booking': BookingSerializer(booking).data,
            'payment': payment,
            'email_sent': email_sent,
            'email_error': email_error,
        })
