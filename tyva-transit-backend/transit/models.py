import random
import string

from django.db import models
from django.utils import timezone


def generate_booking_code(booking_type: str) -> str:
    prefix = 'TYV-T' if booking_type == Booking.BookingType.SHARED else 'TYV-P'
    year = timezone.now().year
    suffix = ''.join(random.choices(string.digits, k=4))
    return f'{prefix}-{year}-{suffix}'


class Destination(models.Model):
    name = models.CharField('Название', max_length=200)
    slug = models.SlugField('Код', unique=True)
    route_label = models.CharField('Маршрут', max_length=200, help_text='Например: Кызыл → Чагытай')
    meeting_point = models.CharField('Сбор', max_length=300, default='ул. Кочетова, 2')
    description = models.TextField('Описание', blank=True)
    is_active = models.BooleanField('Активно', default=True)

    class Meta:
        verbose_name = 'Направление'
        verbose_name_plural = 'Направления'
        ordering = ['route_label']

    def __str__(self):
        return self.route_label


class Trip(models.Model):
    destination = models.ForeignKey(Destination, on_delete=models.PROTECT, related_name='trips')
    departure_at = models.DateTimeField('Выезд')
    seats_total = models.PositiveSmallIntegerField('Мест всего', default=12)
    seats_booked = models.PositiveSmallIntegerField('Забронировано', default=0)
    price_per_seat = models.DecimalField('Цена за место', max_digits=10, decimal_places=2)
    duration_hours = models.DecimalField('Часов в пути', max_digits=4, decimal_places=1, null=True, blank=True)
    is_active = models.BooleanField('Активен', default=True)

    class Meta:
        verbose_name = 'Рейс'
        verbose_name_plural = 'Рейсы'
        ordering = ['departure_at']

    def __str__(self):
        return f'{self.destination.route_label} · {self.departure_at:%d.%m.%Y %H:%M}'

    @property
    def seats_available(self) -> int:
        return max(0, self.seats_total - self.seats_booked)


class Booking(models.Model):
    class BookingType(models.TextChoices):
        SHARED = 'shared', 'Общий рейс'
        PRIVATE = 'private', 'Личная поездка'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидает'
        PAID = 'paid', 'Оплачено'
        CONFIRMED = 'confirmed', 'Подтверждено'
        CANCELLED = 'cancelled', 'Отменено'

    class PaymentMethod(models.TextChoices):
        SBP = 'sbp', 'СБП'
        CARD = 'card', 'Банковская карта'
        STUB = 'stub', 'Заглушка'

    class VehicleType(models.TextChoices):
        MINIVAN_8 = 'minivan_8', 'Минивэн до 8 мест'
        BUS_12 = 'bus_12', 'Микроавтобус до 12 мест'

    code = models.CharField('Номер', max_length=32, unique=True)
    booking_type = models.CharField('Тип', max_length=10, choices=BookingType.choices)
    status = models.CharField('Статус', max_length=12, choices=Status.choices, default=Status.PENDING)

    trip = models.ForeignKey(Trip, on_delete=models.PROTECT, null=True, blank=True, related_name='bookings')
    destination = models.ForeignKey(Destination, on_delete=models.PROTECT, related_name='bookings')

    departure_date = models.DateField('Дата выезда', null=True, blank=True)
    departure_time = models.CharField('Время', max_length=80, blank=True)
    return_date = models.DateField('Дата обратно', null=True, blank=True)
    round_trip = models.BooleanField('Туда-обратно', default=False)
    vehicle_type = models.CharField('Машина', max_length=20, choices=VehicleType.choices, blank=True)
    comment = models.TextField('Комментарий', blank=True)

    customer_name = models.CharField('Имя', max_length=200)
    phone = models.CharField('Телефон', max_length=32)
    email = models.EmailField('Email')
    seats = models.PositiveSmallIntegerField('Мест', default=1)

    payment_method = models.CharField('Оплата', max_length=10, choices=PaymentMethod.choices, default=PaymentMethod.STUB)
    total_amount = models.DecimalField('Сумма', max_digits=10, decimal_places=2)

    email_sent_at = models.DateTimeField('Билет отправлен', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Бронь'
        verbose_name_plural = 'Брони'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} · {self.customer_name}'

    def save(self, *args, **kwargs):
        if not self.code:
            for _ in range(10):
                code = generate_booking_code(self.booking_type)
                if not Booking.objects.filter(code=code).exists():
                    self.code = code
                    break
        super().save(*args, **kwargs)

    @property
    def is_ticket_ready(self) -> bool:
        return self.status in {self.Status.PAID, self.Status.CONFIRMED}
