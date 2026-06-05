from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # Auth JWT
    path('token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Systèmes
    path('systems/', views.SystemListView.as_view(), name='system_list'),
    path('systems/<str:system_id>/', views.SystemDetailView.as_view(), name='system_detail'),

    # GeoTIFF
    path('orthomap/', views.OrthomapView.as_view(), name='orthomap'),

    path('orthomap/rgb/', views.OrthomapRGBView.as_view()),    
    path('orthomap/thermal/', views.OrthomapThermalView.as_view()),
]