from django.db import migrations


def add_other_destination(apps, schema_editor):
    Destination = apps.get_model('transit', 'Destination')
    Destination.objects.update_or_create(
        slug='other',
        defaults={
            'name': 'Другое',
            'route_label': 'Другое (в комментарии)',
            'meeting_point': 'ул. Кочетова, 2',
        },
    )


def remove_other_destination(apps, schema_editor):
    Destination = apps.get_model('transit', 'Destination')
    Destination.objects.filter(slug='other').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('transit', '0002_booking_user_userprofile'),
    ]

    operations = [
        migrations.RunPython(add_other_destination, remove_other_destination),
    ]
