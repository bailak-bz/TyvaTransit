from django.urls import path

from . import views

urlpatterns = [
    path('destinations/', views.DestinationListView.as_view(), name='destinations'),
    path('trips/', views.TripListView.as_view(), name='trips'),
    path('trips/<int:trip_id>/', views.TripDetailView.as_view(), name='trip-detail'),
    path('bookings/shared/', views.SharedBookingCreateView.as_view(), name='booking-shared'),
    path('bookings/private/', views.PrivateBookingCreateView.as_view(), name='booking-private'),
    path('bookings/lookup/', views.BookingLookupView.as_view(), name='booking-lookup'),
]
