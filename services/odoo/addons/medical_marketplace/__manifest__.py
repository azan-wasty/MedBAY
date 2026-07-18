{
    'name': 'Medical Marketplace',
    'version': '1.0',
    'category': 'Sales',
    'summary': 'Medical Equipment B2B Marketplace addon for Odoo',
    'depends': [
        'web',
        'base',
        'product',
        'sale',
        'mail',      # mail.template / send_mail for notifications
        'stock',     # picking_ids for order tracking
        'account',   # invoice_ids for order tracking + credit notes
    ],
    'data': [
        'security/marketplace_security.xml',   # must load before ir.model.access.csv
        'security/ir.model.access.csv',
        'data/return_sequence.xml',
        'data/return_reasons.xml',             # Feature 1: return reason categories
        'data/config_params.xml',              # Feature 1+5: confirmation msg, stage labels
        'data/carrier_config.xml',             # Feature 3: shipping carriers + tracking URLs
        'data/product_attributes.xml',
        'data/mail_templates.xml',
        'views/views.xml',
        'views/return_views.xml',
        'views/carrier_views.xml',             # Feature 3+1: carrier + reason config menus
    ],
    'installable': True,
    'application': True,
}