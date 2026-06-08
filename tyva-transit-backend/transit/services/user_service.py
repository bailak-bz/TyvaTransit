from django.contrib.auth.models import User

from transit.models import Booking
from transit.views import normalize_phone


def link_bookings_to_user(user: User) -> int:
    """Привязывает старые брони по email и телефону профиля."""
    profile = getattr(user, 'profile', None)
    if profile is None:
        return 0

    email = (user.email or '').strip().lower()
    phone_norm = normalize_phone(profile.phone)
    if not email and not phone_norm:
        return 0

    linked = 0
    for booking in Booking.objects.filter(user__isnull=True).iterator():
        booking_email = (booking.email or '').strip().lower()
        booking_phone = normalize_phone(booking.phone)
        if (email and booking_email == email) or (phone_norm and booking_phone == phone_norm):
            booking.user = user
            booking.save(update_fields=['user'])
            linked += 1
    return linked
