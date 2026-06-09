from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from transit.models import Destination, Trip


class Command(BaseCommand):
    help = 'Заполняет БД направлениями и примерами рейсов'

    def handle(self, *args, **options):
        destinations = [
            {
                'slug': 'chagytay',
                'name': 'Озеро Чагытай',
                'route_label': 'Кызыл → Чагытай',
                'meeting_point': 'ул. Кочетова, 2',
            },
            {
                'slug': 'tereh-hol',
                'name': 'Озеро Тере-Холь',
                'route_label': 'Кызыл → Тере-Холь',
                'meeting_point': 'ул. Кочетова, 2',
            },
            {
                'slug': 'azas',
                'name': 'Азас',
                'route_label': 'Кызыл → Азас',
                'meeting_point': 'ул. Кочетова, 2',
            },
            {
                'slug': 'other',
                'name': 'Другое',
                'route_label': 'Другое (в комментарии)',
                'meeting_point': 'ул. Кочетова, 2',
            },
            {
                'slug': 'chagytay-back',
                'name': 'Чагытай → Кызыл',
                'route_label': 'Чагытай → Кызыл',
                'meeting_point': 'Берег озера Чагытай',
            },
        ]

        dest_map = {}
        for item in destinations:
            obj, _ = Destination.objects.update_or_create(slug=item['slug'], defaults=item)
            dest_map[item['slug']] = obj

        base = timezone.make_aware(datetime(2026, 6, 15, 6, 0))
        samples = [
            ('chagytay', base, Decimal('1800'), Decimal('3.5'), 7),
            ('tereh-hol', base + timedelta(days=2, hours=1), Decimal('2000'), Decimal('4.0'), 10),
            ('azas', base + timedelta(days=4), Decimal('2200'), Decimal('5.0'), 12),
            ('chagytay-back', base + timedelta(days=7, hours=2), Decimal('1800'), Decimal('3.5'), 8),
        ]

        created = 0
        for slug, dep, price, duration, booked in samples:
            dest = dest_map[slug]
            trip, was_created = Trip.objects.get_or_create(
                destination=dest,
                departure_at=dep,
                defaults={
                    'price_per_seat': price,
                    'duration_hours': duration,
                    'seats_booked': booked,
                    'seats_total': 12,
                },
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Направлений: {len(dest_map)}, новых рейсов: {created}'))
