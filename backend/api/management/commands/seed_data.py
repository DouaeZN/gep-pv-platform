import pandas as pd
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import PVSystem, Module, Inverter, DCProduction, ACProduction
from django.utils import timezone
import pytz


class Command(BaseCommand):
    help = 'Charge les données réelles des fichiers CSV dans la base de données'

    def handle(self, *args, **kwargs):
        self.stdout.write('--- Seed GEP Platform (données réelles CSV) ---')

        DATA_DIR = settings.BASE_DIR.parent / 'data'

        # 1. PV SYSTEMS

        self.stdout.write('Chargement de pvsystems.csv...')
        df_sys = pd.read_csv(DATA_DIR / 'pvsystems.csv')

        for _, row in df_sys.iterrows():
            system, created = PVSystem.objects.get_or_create(
                system_id=row['system_id'],
                defaults={
                    'name': row['system_name'],
                    'capacity_kwc': row['total_capacity_kwc'],
                    'commissioning_date': row['commissioning_date'],
                    'inclination': row['tilt_angle'],
                    'orientation': row['orientation'],
                    'nb_strings': row['nb_strings'],
                    'latitude': row['latitude'],
                    'longitude': row['longitude'],
                    'module_id_ref': row['module_id'],
                    'inverter_id_ref': row['inverter_id'],
                }
            )
            status = 'Créé' if created else 'Déjà existant'
            self.stdout.write(f'  {status} : {row["system_id"]} — {row["system_name"]}')

        # 2. MODULES
        self.stdout.write('Chargement de modules.csv...')
        df_mod = pd.read_csv(DATA_DIR / 'modules.csv')

        # On fait le lien module → system via pvsystems.csv
        df_sys_ref = pd.read_csv(DATA_DIR / 'pvsystems.csv')
        mod_to_sys = dict(zip(df_sys_ref['module_id'], df_sys_ref['system_id']))

        for _, row in df_mod.iterrows():
            system_id = mod_to_sys.get(row['module_id'])
            if not system_id:
                self.stdout.write(f'  Aucun système pour {row["module_id"]}, skip.')
                continue
            try:
                system = PVSystem.objects.get(system_id=system_id)
            except PVSystem.DoesNotExist:
                continue

            Module.objects.update_or_create(
                module_id=row['module_id'],
                defaults={
                    'system': system,
                    'brand': row['brand'],
                    'model': row['model'],
                    'technology': row['technology'],
                    'power_wc': row['power_wc'],
                    'nb_per_string': row['nb_per_string'],
                    'voc_v': row['voc_v'],
                    'isc_a': row['isc_a'],
                    'temp_coeff_pmax': row['temp_coeff_pmax'],
                }
            )
            self.stdout.write(f'  Module {row["module_id"]} : {row["brand"]} {row["model"]}')

        # 3. INVERTERS

        self.stdout.write('Chargement de inverters.csv...')
        df_inv = pd.read_csv(DATA_DIR / 'inverters.csv')

        for _, row in df_inv.iterrows():
            try:
                system = PVSystem.objects.get(system_id=row['system_id'])
            except PVSystem.DoesNotExist:
                self.stdout.write(f'  Système {row["system_id"]} introuvable, skip.')
                continue

            inverter, created = Inverter.objects.update_or_create(
                inverter_id=row['inverter_id'],
                defaults={
                    'system': system,
                    'brand': row['brand'],
                    'model': row['model'],
                    'power_kw_ac': row['power_kw_ac'],
                    'nb_mppt': row['nb_mppt'],
                    'max_input_voltage_v': row['max_input_voltage_v'],
                    'max_input_current_a': row['max_input_current_a'],
                    'efficiency_pct': row['efficiency_pct'],
                    'serial_number': row['serial_number'],
                }
            )
            status = 'Créé' if created else 'Mis à jour'
            self.stdout.write(f'  {status} onduleur {row["inverter_id"]} : {row["brand"]} {row["model"]}')

        # 4. DC PRODUCTION
        self.stdout.write('Chargement de dc_production.csv...')
        if DCProduction.objects.count() > 0:
            self.stdout.write('  Données DC déjà présentes, skip.')
        else:
            df_dc = pd.read_csv(DATA_DIR / 'dc_production.csv')
            df_dc['timestamp'] = pd.to_datetime(df_dc['timestamp'], utc=True)

            records = []
            for _, row in df_dc.iterrows():
                try:
                    system = PVSystem.objects.get(system_id=row['system_id'])
                except PVSystem.DoesNotExist:
                    continue
                records.append(DCProduction(
                    timestamp=row['timestamp'],
                    system=system,
                    dc_power_kw=row['dc_power_kw'],
                    dc_voltage_v=row['dc_voltage_v'],
                    dc_current_a=row['dc_current_a'],
                    irradiance_wm2=row['irradiance_wm2'],
                ))

            DCProduction.objects.bulk_create(records, ignore_conflicts=True)
            self.stdout.write(f'  {len(records)} mesures DC insérées.')

        # 5. AC PRODUCTION
        
        self.stdout.write('Chargement de ac_production.csv...')
        if ACProduction.objects.count() > 0:
            self.stdout.write('  Données AC déjà présentes, skip.')
        else:
            df_ac = pd.read_csv(DATA_DIR / 'ac_production.csv')
            df_ac['timestamp'] = pd.to_datetime(df_ac['timestamp'], utc=True)

            records = []
            for _, row in df_ac.iterrows():
                try:
                    system = PVSystem.objects.get(system_id=row['system_id'])
                except PVSystem.DoesNotExist:
                    continue
                records.append(ACProduction(
                    timestamp=row['timestamp'],
                    system=system,
                    ac_power_kw=row['ac_power_kw'],
                    ac_energy_kwh=row['ac_energy_kwh'],
                    ac_voltage_v=row['ac_voltage_v'],
                    ac_frequency_hz=row['ac_frequency_hz'],
                    power_factor=row['power_factor'],
                ))

            ACProduction.objects.bulk_create(records, ignore_conflicts=True)
            self.stdout.write(f'  {len(records)} mesures AC insérées.')

        self.stdout.write(self.style.SUCCESS('\nSeed terminé avec succès !'))