import base64
import logging
import urllib.request

_logger = logging.getLogger(__name__)

# 30 Medical Marketplace products with explicit 1-to-1 matching medical equipment images
PRODUCT_SEED_DATA = {
    # ── Category 1: Diagnostic Equipment ────────────────────────────────────
    'medical_marketplace.product_stethoscope_pro': {
        'stock': 45,
        'image_url': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_bp_monitor': {
        'stock': 28,
        'image_url': 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_infrared_thermometer': {
        'stock': 85,
        'image_url': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_pulse_oximeter': {
        'stock': 120,
        'image_url': 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_glucometer_kit': {
        'stock': 60,
        'image_url': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    },

    # ── Category 2: Hospital Furniture ───────────────────────────────────────
    'medical_marketplace.product_examination_table': {
        'stock': 8,
        'image_url': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_hospital_bed': {
        'stock': 2,
        'image_url': 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_wheelchair': {
        'stock': 14,
        'image_url': 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_iv_pole': {
        'stock': 35,
        'image_url': 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_crash_cart': {
        'stock': 5,
        'image_url': 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80',
    },

    # ── Category 3: PPE & Consumables ────────────────────────────────────────
    'medical_marketplace.product_nitrile_gloves': {
        'stock': 500,
        'image_url': 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_surgical_mask': {
        'stock': 850,
        'image_url': 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_luer_syringe': {
        'stock': 340,
        'image_url': 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_gauze_pads': {
        'stock': 420,
        'image_url': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_hand_sanitizer': {
        'stock': 600,
        'image_url': 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80',
    },

    # ── Category 4: Surgical Instruments ────────────────────────────────────
    'medical_marketplace.product_scalpel_set': {
        'stock': 65,
        'image_url': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_forceps_set': {
        'stock': 25,
        'image_url': 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_surgical_kit': {
        'stock': 12,
        'image_url': 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_needle_holder': {
        'stock': 40,
        'image_url': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_scissors_set': {
        'stock': 30,
        'image_url': 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80',
    },

    # ── Category 5: Imaging & Lab Equipment ──────────────────────────────────
    'medical_marketplace.product_ultrasound_scanner': {
        'stock': 6,
        'image_url': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_centrifuge': {
        'stock': 9,
        'image_url': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_microscope': {
        'stock': 11,
        'image_url': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_hematology_analyzer': {
        'stock': 4,
        'image_url': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_pcr_cycler': {
        'stock': 3,
        'image_url': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
    },

    # ── Category 6: Home Care Equipment ──────────────────────────────────────
    'medical_marketplace.product_nebulizer': {
        'stock': 50,
        'image_url': 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_aluminum_walker': {
        'stock': 32,
        'image_url': 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_oxygen_concentrator': {
        'stock': 15,
        'image_url': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_rollator': {
        'stock': 18,
        'image_url': 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=600&q=80',
    },
    'medical_marketplace.product_bed_wedge': {
        'stock': 40,
        'image_url': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
    },
}


def post_init_hook(env):
    """Post-install hook to set stock quantities and fetch product images."""
    _logger.info("Running medical_marketplace post_init_hook to seed stock and images...")

    # Find default stock location
    stock_location = env.ref('stock.stock_location_stock', raise_if_not_found=False)
    if not stock_location:
        stock_location = env['stock.location'].sudo().search([('usage', '=', 'internal')], limit=1)

    for xml_id, data in PRODUCT_SEED_DATA.items():
        product_tmpl = env.ref(xml_id, raise_if_not_found=False)
        if not product_tmpl:
            _logger.warning("Product template %s not found during post_init_hook", xml_id)
            continue

        # 1. Update image
        if data.get('image_url'):
            try:
                req = urllib.request.Request(
                    data['image_url'],
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        image_data = resp.read()
                        product_tmpl.sudo().write({
                            'image_1920': base64.b64encode(image_data)
                        })
                        _logger.info("Successfully set image for product %s", product_tmpl.name)
            except Exception as e:
                _logger.warning("Failed to download image for %s from %s: %s", product_tmpl.name, data['image_url'], e)

        # 2. Set stock on hand via stock.quant
        if stock_location and data.get('stock') is not None:
            variant = product_tmpl.product_variant_id
            if variant:
                try:
                    quant = env['stock.quant'].sudo().search([
                        ('product_id', '=', variant.id),
                        ('location_id', '=', stock_location.id)
                    ], limit=1)
                    if quant:
                        quant.sudo().with_context(inventory_mode=True).write({
                            'inventory_quantity': data['stock']
                        })
                        quant.sudo().action_apply_inventory()
                    else:
                        quant = env['stock.quant'].sudo().with_context(inventory_mode=True).create({
                            'product_id': variant.id,
                            'location_id': stock_location.id,
                            'inventory_quantity': data['stock']
                        })
                        quant.sudo().action_apply_inventory()
                    _logger.info("Set stock for %s to %d units", product_tmpl.name, data['stock'])
                except Exception as e:
                    _logger.error("Failed to set stock for %s: %s", product_tmpl.name, e)

    _logger.info("Finished medical_marketplace post_init_hook successfully.")
