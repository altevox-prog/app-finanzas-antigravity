export const INVOICE_TEMPLATES = [
  { id: 'soporte', label: 'Documento Soporte (Modelo 1)', defaultTitle: 'SOPORTE EN ADQUISICIONES EFECTUADAS, NO OBLIGADOS A FACTURAR' },
  { id: 'servicios', label: 'Factura de Servicios (Modelo 2)', defaultTitle: 'FACTURA DE SERVICIOS' }
];

export const INITIAL_INVOICE_STATE = {
  template: 'soporte',
  docTitle: 'SOPORTE EN ADQUISICIONES EFECTUADAS, NO OBLIGADOS A FACTURAR',
  emitter: {
    logo: '',
    name: 'Esteban Osorio Pabón',
    docType: 'CC',
    docNumber: '1037588061-9',
    address: 'Calle 48 F Sur N 39B 143',
    email: 'asistenciaprimes@gmail.com',
    phone: '(+57) 3137884537'
  },
  client: {
    name: '',
    contactPerson: '',
    city: '',
    email: ''
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
      bank: 'Bancolombia',
      holder: 'Esteban Osorio',
      accountType: 'Ahorros',
      accountNumber: '27564469489',
      swift: 'COLOCOBM',
      nequi: '3137884537'
    },
    achWire: {
      enabled: false,
      bank: 'Lead Bank',
      holder: 'Esteban Osorio',
      accountType: 'Corriente',
      accountNumber: '215068446205',
      routing: '101019644',
      bankAddress: '1801 MAIN ST Kansas City, Missouri 64108 EE.UU.'
    }
  }
};