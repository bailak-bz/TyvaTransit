"""Заглушка оплаты — без реального списания денег."""

from django.conf import settings


def process_stub_payment(booking) -> dict:
    if not settings.PAYMENT_STUB_ENABLED:
        raise ValueError('Оплата отключена в настройках')

    return {
        'success': True,
        'provider': 'stub',
        'message': 'Оплата прошла успешно (демо-режим, деньги не списаны)',
        'booking_code': booking.code,
        'amount': str(booking.total_amount),
    }
