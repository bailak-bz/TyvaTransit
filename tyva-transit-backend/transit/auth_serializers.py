from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserProfile


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    display_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=32)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('Пользователь с таким email уже зарегистрирован.')
        if User.objects.filter(username__iexact=email).exists():
            raise serializers.ValidationError('Пользователь с таким email уже зарегистрирован.')
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        email = validated_data['email']
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
        )
        UserProfile.objects.create(
            user=user,
            phone=validated_data['phone'].strip(),
            display_name=validated_data['display_name'].strip(),
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ProfileUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=200, required=False)
    phone = serializers.CharField(max_length=32, required=False)


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    display_name = serializers.CharField()
    phone = serializers.CharField()

    @staticmethod
    def from_user(user):
        profile = getattr(user, 'profile', None)
        return {
            'id': user.id,
            'email': user.email,
            'display_name': profile.display_name if profile else '',
            'phone': profile.phone if profile else '',
        }
