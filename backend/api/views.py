from django.utils import timezone
from datetime import timedelta
from django.http import FileResponse, HttpResponse
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PVSystem, Module, Inverter, DCProduction, ACProduction
import io
from rio_tiler.io import Reader
from PIL import Image as PILImage

class SystemListView(APIView):
    def get(self, request):

        systems = PVSystem.objects.all()
        data = []

        for s in systems:
            last_ac = ACProduction.objects.filter(
                system=s
            ).order_by('-timestamp').first()

            last_ac = ACProduction.objects.filter(system=s).order_by('-timestamp').first()
            if last_ac:
                last_day = last_ac.timestamp.date()
                daily_energy = sum(
                    ACProduction.objects.filter(
                        system=s, timestamp__date=last_day
                    ).values_list('ac_energy_kwh', flat=True)
                )
            else:
                daily_energy = 0

            # Prendre le premier module et la liste des onduleurs
            module = Module.objects.filter(system=s).first()
            inverters = list(Inverter.objects.filter(system=s).values(
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

        days = request.query_params.get('days', '7')

        dc_qs = DCProduction.objects.filter(system=system).order_by('-timestamp')

        if dc_qs.exists():
            last_date = dc_qs.first().timestamp
            since = last_date - timedelta(days=int(days))
            dc_qs = dc_qs.filter(timestamp__gte=since).order_by('timestamp')

        ac_qs = ACProduction.objects.filter(system=system).order_by('-timestamp')

        if ac_qs.exists():
            last_date = ac_qs.first().timestamp
            since = last_date - timedelta(days=int(days))
            ac_qs = ac_qs.filter(timestamp__gte=since).order_by('timestamp')

        dc_data = list(dc_qs.values(
            'timestamp', 'dc_power_kw', 'dc_voltage_v',
            'dc_current_a', 'irradiance_wm2'
        ))

        ac_data = list(ac_qs.values(
            'timestamp', 'ac_power_kw', 'ac_energy_kwh',
            'ac_voltage_v', 'ac_frequency_hz', 'power_factor'
        ))

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
        tif_path = settings.DATA_DIR / 'masque.tif'
        if not tif_path.exists():
            return Response(
                {'error': 'Fichier GeoTIFF non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
        return FileResponse(
            open(tif_path, 'rb'),
            content_type='image/tiff'
        )
    
def get_wgs84_bounds(src):
    """Convertit les coordonnées du GeoTIFF en WGS84 (lat/lng)."""
    from rasterio.warp import transform_bounds
    bounds = transform_bounds(src.crs, 'EPSG:4326', *src.bounds)
    return bounds  # (west, south, east, north) en degrés


class OrthomapRGBView(APIView):
    def get(self, request):
        tif_path = settings.DATA_DIR / 'masque.tif'
        if not tif_path.exists():
            return Response({'error': 'GeoTIFF non trouvé'}, status=404)
        try:
            import rasterio
            from rasterio.enums import Resampling
            import numpy as np

            with rasterio.open(tif_path) as src:
                scale = min(1.0, 1000 / src.width)
                new_width = int(src.width * scale)
                new_height = int(src.height * scale)

                r = src.read(1, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear)
                g = src.read(2, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear)
                b = src.read(3, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear)

                # Convertir en WGS84
                west, south, east, north = get_wgs84_bounds(src)

            rgb = np.stack([r, g, b], axis=-1).astype('uint8')
            img = PILImage.fromarray(rgb)
            buf = io.BytesIO()
            img.save(buf, format='PNG', optimize=True)
            buf.seek(0)

            from django.http import HttpResponse
            response = HttpResponse(buf.read(), content_type='image/png')
            response['X-Bounds-West']  = str(west)
            response['X-Bounds-South'] = str(south)
            response['X-Bounds-East']  = str(east)
            response['X-Bounds-North'] = str(north)
            response['Access-Control-Expose-Headers'] = (
                'X-Bounds-West, X-Bounds-South, X-Bounds-East, X-Bounds-North'
            )
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=500)


class OrthomapThermalView(APIView):
    def get(self, request):
        tif_path = settings.DATA_DIR / 'masque.tif'
        if not tif_path.exists():
            return Response({'error': 'GeoTIFF non trouvé'}, status=404)
        try:
            import rasterio
            from rasterio.enums import Resampling
            import numpy as np

            with rasterio.open(tif_path) as src:
                scale = min(1.0, 1000 / src.width)
                new_width = int(src.width * scale)
                new_height = int(src.height * scale)

                r = src.read(1, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear).astype(float)
                g = src.read(2, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear).astype(float)
                b = src.read(3, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear).astype(float)

                # Convertir en WGS84
                west, south, east, north = get_wgs84_bounds(src)

            thermal = 0.3 * r + 0.59 * g + 0.11 * b
            t = 1 - (thermal - thermal.min()) / (thermal.max() - thermal.min() + 1)

            INFERNO = np.array([
                [0,   0,   4],
                [40,  11,  84],
                [101, 21,  110],
                [159, 42,  99],
                [212, 72,  66],
                [245, 125, 21],
                [250, 193, 39],
                [252, 255, 164],
            ], dtype=float)

            idx = t * (len(INFERNO) - 1)
            lo = np.floor(idx).astype(int).clip(0, len(INFERNO) - 2)
            hi = (lo + 1).clip(0, len(INFERNO) - 1)
            frac = (idx - lo)[..., np.newaxis]
            rgb = (INFERNO[lo] * (1 - frac) + INFERNO[hi] * frac).astype('uint8')
            alpha = np.full((*rgb.shape[:2], 1), 180, dtype='uint8')
            rgba = np.concatenate([rgb, alpha], axis=-1)

            img = PILImage.fromarray(rgba, 'RGBA')
            buf = io.BytesIO()
            img.save(buf, format='PNG', optimize=True)
            buf.seek(0)

            from django.http import HttpResponse
            response = HttpResponse(buf.read(), content_type='image/png')
            response['X-Bounds-West']  = str(west)
            response['X-Bounds-South'] = str(south)
            response['X-Bounds-East']  = str(east)
            response['X-Bounds-North'] = str(north)
            response['Access-Control-Expose-Headers'] = (
                'X-Bounds-West, X-Bounds-South, X-Bounds-East, X-Bounds-North'
            )
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=500)
    """Génère la couche thermique simulée en PNG côté serveur."""

    def get(self, request):
        tif_path = settings.DATA_DIR / 'masque.tif'
        if not tif_path.exists():
            return Response({'error': 'GeoTIFF non trouvé'}, status=404)

        try:
            import rasterio
            from rasterio.enums import Resampling
            import numpy as np

            with rasterio.open(tif_path) as src:
                scale = min(1.0, 1000 / src.width)
                new_width = int(src.width * scale)
                new_height = int(src.height * scale)

                r = src.read(1, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear).astype(float)
                g = src.read(2, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear).astype(float)
                b = src.read(3, out_shape=(new_height, new_width),
                             resampling=Resampling.bilinear).astype(float)

                bounds = src.bounds

            # Calculer valeur thermique simulée
            thermal = 0.3 * r + 0.59 * g + 0.11 * b
            t = 1 - (thermal - thermal.min()) / (thermal.max() - thermal.min() + 1)

            # Palette Inferno
            INFERNO = np.array([
                [0,   0,   4],
                [40,  11,  84],
                [101, 21,  110],
                [159, 42,  99],
                [212, 72,  66],
                [245, 125, 21],
                [250, 193, 39],
                [252, 255, 164],
            ], dtype=float)

            idx = t * (len(INFERNO) - 1)
            lo = np.floor(idx).astype(int).clip(0, len(INFERNO) - 2)
            hi = (lo + 1).clip(0, len(INFERNO) - 1)
            frac = (idx - lo)[..., np.newaxis]

            rgb = (INFERNO[lo] * (1 - frac) + INFERNO[hi] * frac).astype('uint8')
            alpha = np.full((*rgb.shape[:2], 1), 180, dtype='uint8')
            rgba = np.concatenate([rgb, alpha], axis=-1)

            img = PILImage.fromarray(rgba, 'RGBA')
            buf = io.BytesIO()
            img.save(buf, format='PNG', optimize=True)
            buf.seek(0)

            from django.http import HttpResponse
            response = HttpResponse(buf.read(), content_type='image/png')
            response['X-Bounds-West'] = str(bounds.left)
            response['X-Bounds-South'] = str(bounds.bottom)
            response['X-Bounds-East'] = str(bounds.right)
            response['X-Bounds-North'] = str(bounds.top)
            response['Access-Control-Expose-Headers'] = (
                'X-Bounds-West, X-Bounds-South, X-Bounds-East, X-Bounds-North'
            )
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=500)
        
class TileView(APIView):
    """Sert les tuiles XYZ depuis le COG — bonne résolution à chaque zoom."""

    def get(self, request, z, x, y):
        tif_path = str(settings.DATA_DIR / 'masque.tif')
        try:
            with Reader(tif_path) as cog:
                img = cog.tile(x, y, z, indexes=[1, 2, 3])
                content = img.render(img_format="PNG")
            return HttpResponse(content, content_type='image/png')
        except Exception:
            # Tuile hors bounds — retourner transparent
            from PIL import Image as PILImage
            buf = io.BytesIO()
            PILImage.new('RGBA', (256, 256), (0, 0, 0, 0)).save(buf, 'PNG')
            return HttpResponse(buf.getvalue(), content_type='image/png')
        
class SystemsGeoJSONView(APIView):
    """Sert le GeoJSON des systèmes converti en WGS84 avec données live."""

    def get(self, request):
        import json
        from pyproj import Transformer

        geojson_path = settings.DATA_DIR / 'systems.geojson'
        if not geojson_path.exists():
            return Response({'error': 'GeoJSON non trouvé'}, status=404)

        with open(geojson_path) as f:
            geojson = json.load(f)

        # Transformer UTM 32629 → WGS84
        transformer = Transformer.from_crs('EPSG:32629', 'EPSG:4326', always_xy=True)

        def convert_coords(coords):
            """Convertit récursivement toutes les coordonnées."""
            if isinstance(coords[0], list):
                return [convert_coords(c) for c in coords]
            lng, lat = transformer.transform(coords[0], coords[1])
            return [lng, lat]

        # Enrichir chaque feature avec les données du système
        for feature in geojson['features']:
            system_id = feature['properties']['system']
            try:
                system = PVSystem.objects.get(system_id=system_id)
                last_ac = ACProduction.objects.filter(
                    system=system
                ).order_by('-timestamp').first()

                last_day = last_ac.timestamp.date() if last_ac else None
                daily_energy = 0
                if last_day:
                    daily_energy = sum(
                        ACProduction.objects.filter(
                            system=system,
                            timestamp__date=last_day
                        ).values_list('ac_energy_kwh', flat=True)
                    )

                feature['properties'].update({
                    'name': system.name,
                    'capacity_kwc': system.capacity_kwc,
                    'commissioning_date': str(system.commissioning_date),
                    'orientation': system.orientation,
                    'inclination': system.inclination,
                    'last_ac_power_kw': last_ac.ac_power_kw if last_ac else 0,
                    'daily_energy_kwh': round(daily_energy, 2),
                    'last_timestamp': str(last_ac.timestamp) if last_ac else None,
                })
            except PVSystem.DoesNotExist:
                pass

            # Convertir les coordonnées
            geom = feature['geometry']
            geom['coordinates'] = convert_coords(geom['coordinates'])

        # Supprimer le CRS (non standard GeoJSON RFC7946)
        geojson.pop('crs', None)

        return Response(geojson)