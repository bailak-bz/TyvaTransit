import random
import string

from django.db import migrations, models
from django.utils import timezone


def _generate_application_code():
    year = timezone.now().year
    suffix = ''.join(random.choices(string.digits, k=4))
    return f'ZAY-{year}-{suffix}'


def migrate_private_applications(apps, schema_editor):
    Booking = apps.get_model('transit', 'Booking')
    used = set(Booking.objects.exclude(application_code__isnull=True).values_list('application_code', flat=True))
    pending_private = Booking.objects.filter(
        booking_type='private',
        status='pending',
        code__isnull=False,
    )
    for booking in pending_private:
        for _ in range(20):
            code = _generate_application_code()
            if code not in used:
                booking.application_code = code
                used.add(code)
                break
        booking.code = None
        booking.save(update_fields=['application_code', 'code'])


def reverse_migrate(apps, schema_editor):
    Booking = apps.get_model('transit', 'Booking')
    for booking in Booking.objects.filter(
        booking_type='private',
        status='pending',
        application_code__isnull=False,
        code__isnull=True,
    ):
        booking.code = booking.application_code.replace('ZAY-', 'TYV-P-', 1)
        booking.save(update_fields=['code'])


class Migration(migrations.Migration):

    dependencies = [
        ('transit', '0003_destination_other'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='application_code',
            field=models.CharField(
                blank=True,
                max_length=32,
                null=True,
                unique=True,
                verbose_name='Номер заявки',
            ),
        ),
        migrations.AlterField(
            model_name='booking',
            name='code',
            field=models.CharField(
                blank=True,
                max_length=32,
                null=True,
                unique=True,
                verbose_name='Номер брони',
            ),
        ),
        migrations.RunPython(migrate_private_applications, reverse_migrate),
    ]
