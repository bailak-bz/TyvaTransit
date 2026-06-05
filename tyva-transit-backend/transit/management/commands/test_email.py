from django.conf import settings
from django.core.mail import EmailMessage
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Проверка отправки почты (python manage.py test_email ваш@email.ru)'

    def add_arguments(self, parser):
        parser.add_argument('email', help='Куда отправить тестовое письмо')

    def handle(self, *args, **options):
        to = options['email']
        if not settings.EMAIL_SMTP_READY:
            raise CommandError(
                'SMTP не настроен. Откройте .env и укажите реальные EMAIL_HOST_USER и EMAIL_HOST_PASSWORD.\n'
                'Gmail: пароль приложения. Mail.ru: smtp.mail.ru, порт 465, EMAIL_USE_SSL=True'
            )

        EmailMessage(
            subject='Тест ТываТранзит',
            body='Если вы видите это письмо — почта настроена правильно.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
        ).send(fail_silently=False)

        self.stdout.write(self.style.SUCCESS(f'Письмо отправлено на {to}'))
