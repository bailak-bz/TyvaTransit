from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone


class EmailNotConfiguredError(Exception):
    pass


def _format_departure(booking) -> str:
    if booking.trip:
        return booking.trip.departure_at.strftime('%d.%m.%Y, %H:%M')
    parts = []
    if booking.departure_date:
        parts.append(booking.departure_date.strftime('%d.%m.%Y'))
    if booking.departure_time:
        parts.append(booking.departure_time)
    return ', '.join(parts) or '—'


def _booking_body(booking) -> str:
    lines = [
        'ТываТранзит — ваш билет',
        '',
        f'Номер: {booking.code}',
        f'Тип: {booking.get_booking_type_display()}',
        f'Маршрут: {booking.destination.route_label}',
        f'Выезд: {_format_departure(booking)}',
        f'Сбор: {booking.destination.meeting_point}',
        f'Пассажир: {booking.customer_name}',
        f'Телефон: {booking.phone}',
        f'Мест: {booking.seats}',
        f'Статус: {booking.get_status_display()}',
        f'Сумма: {booking.total_amount} ₽',
        '',
    ]
    if booking.booking_type == booking.BookingType.PRIVATE:
        if booking.round_trip and booking.return_date:
            lines.append(f'Обратно: {booking.return_date:%d.%m.%Y}')
        if booking.comment:
            lines.append(f'Комментарий: {booking.comment}')
    lines.extend([
        '',
        'Сохраните номер билета — он понадобится на странице «Мои билеты».',
        '',
        'ИП Ширин-оол Долаана Май-ооловна · г. Кызыл',
    ])
    return '\n'.join(lines)


def _private_request_body(booking) -> str:
    return '\n'.join([
        'ТываТранзит — заявка на личную поездку получена',
        '',
        f'Номер заявки: {booking.code}',
        f'Маршрут: {booking.destination.route_label}',
        f'Дата: {_format_departure(booking)}',
        f'Группа: {booking.seats} чел.',
        f'Статус: ожидает подтверждения перевозчика',
        '',
        'После подтверждения вам придёт билет на этот же email.',
        '',
        'ИП Ширин-оол Долаана Май-ооловна · г. Кызыл',
    ])


def send_ticket_email(booking) -> bool:
    if 'smtp' in settings.EMAIL_BACKEND.lower() and not settings.EMAIL_SMTP_READY:
        raise EmailNotConfiguredError(
            'Почта не настроена. Укажите реальный EMAIL_HOST_USER и EMAIL_HOST_PASSWORD в файле .env'
        )

    if booking.booking_type == booking.BookingType.PRIVATE and booking.status == booking.Status.PENDING:
        subject = f'Заявка {booking.code} принята — ТываТранзит'
        body = _private_request_body(booking)
    else:
        subject = f'Билет {booking.code} — ТываТранзит'
        body = _booking_body(booking)

    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[booking.email],
    )
    message.send(fail_silently=False)

    if settings.CARRIER_NOTIFY_EMAIL:
        carrier = EmailMessage(
            subject=f'[ТываТранзит] {booking.code} — {booking.get_status_display()}',
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.CARRIER_NOTIFY_EMAIL],
        )
        carrier.send(fail_silently=True)

    booking.email_sent_at = timezone.now()
    booking.save(update_fields=['email_sent_at'])
    return True
