from django.utils import timezone
from datetime import timedelta
from django.http import FileResponse
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PVSystem, DCProduction, ACProduction


class SystemListView(APIView):
    def get(self, request):
        systems = PVSystem.objects.prefetch_related('modules', 'inverters').all()
        data = []

        for s in systems:
            last_ac = ACProduction.objects.filter(
                system=s
            ).order_by('-timestamp').first()

            today = timezone.now().date()
            daily_energy = sum(
                ACProduction.objects.filter(
                    system=s, timestamp__date=today
                ).values_list('ac_energy_kwh', flat=True)
            )

            # Prendre le premier module et la liste des onduleurs
            module = s.modules.first()
            inverters = list(s.inverters.values(
                'inverter_id', 'brand', 'model',
                'power_kw_ac', 'nb_mppt', 'serial_number'
            ))

            data.append({
                'system_id': s.system_id,
                'name': s.name,
                'capacity_kwc': s.capacity_kwc,
                'commissioning_date': s.commissioning_date,
                'inclination': s.inclination,
                'orientation': s.orientation,
                'nb_strings': s.nb_strings,
                'latitude': s.latitude,
                'longitude': s.longitude,
                'module': {
                    'brand': module.brand,
                    'model': module.model,
                    'technology': module.technology,
                    'power_wc': module.power_wc,
                    'nb_per_string': module.nb_per_string,
                } if module else None,
                'inverters': inverters,
                'last_ac_power_kw': last_ac.ac_power_kw if last_ac else 0,
                'daily_energy_kwh': round(daily_energy, 2),
                'last_timestamp': last_ac.timestamp if last_ac else None,
            })

        return Response(data)


class SystemDetailView(APIView):
    def get(self, request, system_id):
        try:
            system = PVSystem.objects.get(system_id=system_id)
        except PVSystem.DoesNotExist:
            return Response(
                {'error': f'Système {system_id} introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )

        days = int(request.query_params.get('days', 7))
        since = timezone.now() - timedelta(days=days)

        dc_data = list(
            DCProduction.objects.filter(
                system=system, timestamp__gte=since
            ).order_by('timestamp').values(
                'timestamp', 'dc_power_kw', 'dc_voltage_v',
                'dc_current_a', 'irradiance_wm2'
            )
        )

        ac_data = list(
            ACProduction.objects.filter(
                system=system, timestamp__gte=since
            ).order_by('timestamp').values(
                'timestamp', 'ac_power_kw', 'ac_energy_kwh',
                'ac_voltage_v', 'ac_frequency_hz', 'power_factor'
            )
        )

        return Response({
            'system_id': system_id,
            'name': system.name,
            'dc': dc_data,
            'ac': ac_data,
        })


class OrthomapView(APIView):
    def get(self, request):
        tif_path = settings.DATA_DIR / 'plant_orthomap.tif'
        if not tif_path.exists():
            return Response(
                {'error': 'Fichier GeoTIFF non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
        return FileResponse(
            open(tif_path, 'rb'),
            content_type='image/tiff'
        )