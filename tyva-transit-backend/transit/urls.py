from django.urls import path

from . import auth_views, views

urlpatterns = [
    path('destinations/', views.DestinationListView.as_view(), name='destinations'),
    path('trips/', views.TripListView.as_view(), name='trips'),
    path('trips/<int:trip_id>/', views.TripDetailView.as_view(), name='trip-detail'),
    path('bookings/shared/', views.SharedBookingCreateView.as_view(), name='booking-shared'),
    path('bookings/private/', views.PrivateBookingCreateView.as_view(), name='booking-private'),
    path('bookings/lookup/', views.BookingLookupView.as_view(), name='booking-lookup'),
    path('auth/csrf/', auth_views.CsrfView.as_view(), name='auth-csrf'),
    path('auth/register/', auth_views.RegisterView.as_view(), name='auth-register'),
    path('auth/login/', auth_views.LoginView.as_view(), name='auth-login'),
    path('auth/logout/', auth_views.LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', auth_views.MeView.as_view(), name='auth-me'),
    path('auth/bookings/', auth_views.MyBookingsView.as_view(), name='auth-bookings'),
]
