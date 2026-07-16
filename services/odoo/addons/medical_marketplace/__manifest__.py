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
        'mail',      # NEW: mail.template / send_mail for RFQ-quoted notifications
        'stock',     # NEW: picking_ids for order tracking
        'account',   # NEW: invoice_ids for order tracking
    ],
    'data': [
        'security/marketplace_security.xml',   # NEW: must load before ir.model.access.csv
        'views/views.xml',
        'data/mail_templates.xml',              # NEW
    ],
    'installable': True,
    'application': True,
}