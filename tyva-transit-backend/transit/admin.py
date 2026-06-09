from django.contrib import admin, messages

from .models import BookingRecord, Destination, PrivateApplication, Trip, UserProfile
from .services.email_service import send_payment_details_email, send_ticket_email


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


@admin.register(PrivateApplication)
class PrivateApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'application_code', 'customer_name', 'phone', 'user', 'destination',
        'departure_date', 'seats', 'total_amount', 'created_at',
    ]
    list_filter = ['created_at', 'destination']
    search_fields = ['application_code', 'customer_name', 'phone', 'email', 'user__email']
    readonly_fields = ['application_code', 'created_at', 'updated_at', 'email_sent_at']
    actions = ['accept_application']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(
            booking_type=PrivateApplication.BookingType.PRIVATE,
            status=PrivateApplication.Status.PENDING,
            code__isnull=True,
        ).select_related('destination', 'user')

    def has_add_permission(self, request):
        return False

    @admin.action(description='Принять заявку и создать бронь')
    def accept_application(self, request, queryset):
        count = 0
        for application in queryset:
            if not application.confirm_as_booking():
                continue
            try:
                send_payment_details_email(application)
            except Exception as exc:
                self.message_user(
                    request,
                    f'Бронь {application.code} создана, но письмо не отправлено: {exc}',
                    messages.WARNING,
                )
            count += 1
        self.message_user(request, f'Принято заявок: {count}', messages.SUCCESS)


@admin.register(BookingRecord)
class BookingRecordAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'booking_type', 'status', 'customer_name', 'phone', 'user',
        'seats', 'total_amount', 'created_at',
    ]
    list_filter = ['booking_type', 'status', 'created_at']
    search_fields = ['code', 'application_code', 'customer_name', 'phone', 'email', 'user__email']
    readonly_fields = ['code', 'application_code', 'created_at', 'updated_at', 'email_sent_at']
    actions = ['mark_paid_and_send_ticket', 'resend_ticket_email']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.exclude(
            booking_type=BookingRecord.BookingType.PRIVATE,
            status=BookingRecord.Status.PENDING,
            code__isnull=True,
        ).select_related('destination', 'trip', 'user')

    @admin.action(description='Отметить оплаченным и отправить билет')
    def mark_paid_and_send_ticket(self, request, queryset):
        count = 0
        for booking in queryset:
            booking.status = BookingRecord.Status.PAID
            booking.save(update_fields=['status'])
            try:
                send_ticket_email(booking)
            except Exception as exc:
                self.message_user(request, f'{booking.code}: {exc}', messages.WARNING)
            count += 1
        self.message_user(request, f'Обработано: {count}', messages.SUCCESS)

    @admin.action(description='Повторно отправить письмо')
    def resend_ticket_email(self, request, queryset):
        count = 0
        for booking in queryset:
            try:
                if booking.needs_payment:
                    send_payment_details_email(booking)
                else:
                    send_ticket_email(booking)
                count += 1
            except Exception as exc:
                self.message_user(request, f'{booking.public_number}: {exc}', messages.WARNING)
        self.message_user(request, f'Отправлено писем: {count}', messages.SUCCESS)
