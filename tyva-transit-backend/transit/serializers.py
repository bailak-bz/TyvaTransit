from decimal import Decimal

from django.conf import settings
from rest_framework import serializers

from .models import Booking, Destination, Trip


class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = ['id', 'name', 'slug', 'route_label', 'meeting_point', 'description']


class TripSerializer(serializers.ModelSerializer):
    destination = DestinationSerializer(read_only=True)
    seats_available = serializers.SerializerMethodField()

    def get_seats_available(self, obj):
        return obj.seats_available
    route_label = serializers.CharField(source='destination.route_label', read_only=True)
    meeting_point = serializers.CharField(source='destination.meeting_point', read_only=True)

    class Meta:
        model = Trip
        fields = [
            'id', 'destination', 'route_label', 'meeting_point',
            'departure_at', 'seats_total', 'seats_booked', 'seats_available',
            'price_per_seat', 'duration_hours', 'is_active',
        ]


class SharedBookingCreateSerializer(serializers.Serializer):
    trip_id = serializers.IntegerField()
    seats = serializers.IntegerField(min_value=1, max_value=12)
    customer_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=32)
    email = serializers.EmailField()
    payment_method = serializers.ChoiceField(
        choices=[Booking.PaymentMethod.SBP, Booking.PaymentMethod.CARD],
        default=Booking.PaymentMethod.SBP,
    )


class PrivateBookingCreateSerializer(serializers.Serializer):
    destination_id = serializers.IntegerField()
    departure_date = serializers.DateField()
    departure_time = serializers.CharField(max_length=80, required=False, allow_blank=True)
    return_date = serializers.DateField(required=False, allow_null=True)
    round_trip = serializers.BooleanField(default=False)
    vehicle_type = serializers.ChoiceField(choices=Booking.VehicleType.choices)
    seats = serializers.IntegerField(min_value=1, max_value=12)
    customer_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=32)
    email = serializers.EmailField()
    comment = serializers.CharField(required=False, allow_blank=True)


class BookingSerializer(serializers.ModelSerializer):
    route_label = serializers.CharField(source='destination.route_label', read_only=True)
    meeting_point = serializers.CharField(source='destination.meeting_point', read_only=True)
    departure_at = serializers.DateTimeField(source='trip.departure_at', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    booking_type_display = serializers.CharField(source='get_booking_type_display', read_only=True)
    public_number = serializers.SerializerMethodField()
    is_application = serializers.SerializerMethodField()
    needs_payment = serializers.SerializerMethodField()
    payment_details = serializers.SerializerMethodField()
    payment_stub = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'application_code', 'code', 'public_number', 'is_application', 'needs_payment',
            'booking_type', 'booking_type_display', 'status', 'status_display',
            'route_label', 'meeting_point', 'departure_at', 'departure_date', 'departure_time',
            'return_date', 'round_trip', 'vehicle_type', 'customer_name', 'phone', 'email',
            'seats', 'total_amount', 'payment_method', 'payment_details', 'payment_stub',
            'comment', 'created_at',
        ]

    def get_public_number(self, obj):
        return obj.public_number

    def get_is_application(self, obj):
        return obj.is_application

    def get_needs_payment(self, obj):
        return obj.needs_payment

    def get_payment_details(self, obj):
        if not obj.needs_payment:
            return None
        return settings.PAYMENT_DETAILS.strip()

    def get_payment_stub(self, obj):
        return {
            'enabled': settings.PAYMENT_STUB_ENABLED and obj.needs_payment,
            'note': 'Демо-оплата: деньги не списываются',
        }


class BookingLookupSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=32)
    phone = serializers.CharField(max_length=32)


def estimate_private_amount(seats: int, vehicle_type: str, round_trip: bool) -> Decimal:
    base = Decimal('14000') if vehicle_type == Booking.VehicleType.MINIVAN_8 else Decimal('18000')
    if seats > 8 and vehicle_type == Booking.VehicleType.MINIVAN_8:
        base = Decimal('18000')
    total = base
    if round_trip:
        total += base
    return total
