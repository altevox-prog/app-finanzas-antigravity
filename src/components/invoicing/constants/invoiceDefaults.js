export const INVOICE_TEMPLATES = [
  { id: 'soporte', label: 'Documento Soporte (Modelo 1)', defaultTitle: 'SOPORTE EN ADQUISICIONES EFECTUADAS, NO OBLIGADOS A FACTURAR' },
  { id: 'servicios', label: 'Factura de Servicios (Modelo 2)', defaultTitle: 'FACTURA DE SERVICIOS' }
];

export const INITIAL_INVOICE_STATE = {
  template: 'soporte',
  docTitle: 'SOPORTE EN ADQUISICIONES EFECTUADAS, NO OBLIGADOS A FACTURAR',
  emitter: {
    name: '',
    docType: 'CC',
    docNumber: '',
    phone: '',
    email: '',
    address: '',
    logo: null
  },
  client: {
    name: '',
    docNumber: '',
    contactPerson: '',
    city: '',
    email: '',
    phone: '',
    address: ''
  },
  meta: {
    issueDate: '',
    dueDate: '',
    paymentTerms: 'O.C.'
  },
  items: [
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ],
  tax: {
    applyIva: true,
    rate: 19
  },
  banking: {
    colombia: {
      bank: '',
      holder: '',
      accountType: '',
      accountNumber: '',
      swift: '',
      nequi: ''
    },
    achWire: {
      enabled: false,
      bank: '',
      holder: '',
      accountType: '',
      accountNumber: '',
      routing: '',
      bankAddress: ''
    }
  }
};
