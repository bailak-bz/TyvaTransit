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
        f'Номер брони: {booking.code}',
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
        'Покажите номер брони при посадке.',
        '',
        'ИП Ширин-оол Долаана Май-ооловна · г. Кызыл',
    ])
    return '\n'.join(lines)


def _private_request_body(booking) -> str:
    return '\n'.join([
        'ТываТранзит — заявка на личную поездку получена',
        '',
        f'Номер заявки: {booking.application_code}',
        f'Маршрут: {booking.destination.route_label}',
        f'Выезд: {_format_departure(booking)}',
        f'Группа: {booking.seats} чел.',
        f'Сумма: {booking.total_amount} ₽',
        f'Статус: ожидает подтверждения перевозчика',
        '',
        'После подтверждения заявки вам придут реквизиты для оплаты на этот email '
        'или они появятся в личном кабинете в разделе «Активные билеты».',
        '',
        'ИП Ширин-оол Долаана Май-ооловна · г. Кызыл',
    ])


def _payment_details_body(booking) -> str:
    return '\n'.join([
        'ТываТранзит — заявка подтверждена',
        '',
        f'Номер брони: {booking.code}',
        f'Маршрут: {booking.destination.route_label}',
        f'Выезд: {_format_departure(booking)}',
        f'Сумма к оплате: {booking.total_amount} ₽',
        '',
        'Реквизиты для оплаты:',
        settings.PAYMENT_DETAILS.strip(),
        '',
        'После оплаты билет появится в личном кабинете. '
        'Также можно нажать «Оплата» в разделе «Активные билеты».',
        '',
        'ИП Ширин-оол Долаана Май-ооловна · г. Кызыл',
    ])


def _send_email(subject: str, body: str, to: list[str], booking) -> bool:
    if 'smtp' in settings.EMAIL_BACKEND.lower() and not settings.EMAIL_SMTP_READY:
        raise EmailNotConfiguredError(
            'Почта не настроена. Укажите реальный EMAIL_HOST_USER и EMAIL_HOST_PASSWORD в файле .env'
        )

    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=to,
    )
    message.send(fail_silently=False)

    if settings.CARRIER_NOTIFY_EMAIL:
        carrier = EmailMessage(
            subject=f'[ТываТранзит] {booking.public_number} — {booking.get_status_display()}',
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.CARRIER_NOTIFY_EMAIL],
        )
        carrier.send(fail_silently=True)

    booking.email_sent_at = timezone.now()
    booking.save(update_fields=['email_sent_at'])
    return True


def send_application_email(booking) -> bool:
    subject = f'Заявка {booking.application_code} принята — ТываТранзит'
    return _send_email(subject, _private_request_body(booking), [booking.email], booking)


def send_payment_details_email(booking) -> bool:
    subject = f'Бронь {booking.code} — реквизиты для оплаты — ТываТранзит'
    return _send_email(subject, _payment_details_body(booking), [booking.email], booking)


def send_ticket_email(booking) -> bool:
    if booking.is_application:
        return send_application_email(booking)
    if booking.needs_payment:
        return send_payment_details_email(booking)

    subject = f'Билет {booking.code} — ТываТранзит'
    return _send_email(subject, _booking_body(booking), [booking.email], booking)
