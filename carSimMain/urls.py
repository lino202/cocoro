from django.urls import path

from . import views
app_name = 'carSimMain'
urlpatterns = [
    path('tissue/', views.tissue, name='tissue'),
    path('cellular/', views.cellular, name='cellular'),
    
]