from django.urls import path

from . import views
app_name = 'carSimRender'
urlpatterns = [
    path('', views.index, name='index'),
]