from django.contrib import admin, messages

from .models import Booking, Destination, Trip, UserProfile
from .services.email_service import send_ticket_email


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = ['route_label', 'slug', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'route_label', 'slug']


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['destination', 'departure_at', 'seats_available', 'price_per_seat', 'is_active']
    list_filter = ['is_active', 'destination']
    date_hierarchy = 'departure_at'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'user', 'phone']
    search_fields = ['display_name', 'phone', 'user__email']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'booking_type', 'status', 'customer_name', 'phone', 'user',
        'seats', 'total_amount', 'created_at',
    ]
    list_filter = ['booking_type', 'status', 'created_at']
    search_fields = ['code', 'customer_name', 'phone', 'email', 'user__email']
    readonly_fields = ['code', 'created_at', 'updated_at', 'email_sent_at']
    actions = ['confirm_private_and_send_email', 'resend_ticket_email']

    @admin.action(description='Подтвердить личную поездку и отправить билет')
    def confirm_private_and_send_email(self, request, queryset):
        count = 0
        for booking in queryset.filter(booking_type=Booking.BookingType.PRIVATE):
            booking.status = Booking.Status.CONFIRMED
            booking.save(update_fields=['status'])
            send_ticket_email(booking)
            count += 1
        self.message_user(request, f'Подтверждено и отправлено: {count}', messages.SUCCESS)

    @admin.action(description='Повторно отправить билет на email')
    def resend_ticket_email(self, request, queryset):
        count = 0
        for booking in queryset:
            send_ticket_email(booking)
            count += 1
        self.message_user(request, f'Отправлено писем: {count}', messages.SUCCESS)
