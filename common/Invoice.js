const Util = require('../common/functions');

module.exports = {
    noun: 'Invoice',
    getById: async function (z, bundle, storeId, invoiceId) {
        const options = {
            url: bundle.authData.server_url + '/api/v1/stores/' + storeId + '/invoices/' + invoiceId,
            method: 'GET',
            params: {},
            body: {},
        };

        let response = await z.request(options);
        if (response.status === 200) {
            return this.format(response.json, storeId);
        } else {
            throw new z.errors.Error('Invoice could not be found.', 'NotFound', 404);
        }
    },

    create: async function (z, serverUrl, storeId, amount, currency, orderId, orderUrl, buyerName, buyerEmail, buyerCountry, buyerZip, buyerState, buyerCity, buyerAddress1, buyerAddress2, buyerPhone) {
        const options = {
            url: serverUrl + '/api/v1/stores/' + storeId + '/invoices/',
            method: 'POST',
            params: {},
            body: {
                amount: amount,
                currency: currency,
                metadata: {
                    orderId: orderId,
                    orderUrl: orderUrl,
                    buyerName: buyerName,
                    buyerEmail: buyerEmail,
                    buyerCountry: buyerCountry,
                    buyerZip: buyerZip,
                    buyerState: buyerState,
                    buyerCity: buyerCity,
                    buyerAddress1: buyerAddress1,
                    buyerAddress2: buyerAddress2,
                    buyerPhone: buyerPhone,
                }
            }
        };

        let response = await z.request(options);
        if (response.status === 200) {
            return this.format(response.json, storeId);
        } else if (response.status === 403) {
            throw new z.errors.Error('Forbidden. Invoice could not be created.', 'Forbidden', response.status);
        } else {
            let errorMsg = 'Error: ';
            for (let i = 0; i < response.json.length; i++) {
                errorMsg += response.json[i].message + ', ';
            }
            throw new z.errors.Error(errorMsg, 'InvalidData', response.status);
        }
    },

    performForOne: async function (z, bundle) {
        Util.validateSignature(z, bundle);
        const invoice = await module.exports.getById(z, bundle, bundle.inputData.store_id, bundle.cleanedRequest.invoiceId);

        // TODO should we merge a few fields that came with the webhook, like "partiallyPaid", "afterExpiration", "overPaid" and "manuallyMarked"? Also add to "outputFields" if we decide to do so.

        return [invoice];
    },


    format: function (invoice, storeId) {

        if (typeof invoice.storeId === 'undefined') {
            // TODO remove this when https://github.com/btcpayserver/btcpayserver/pull/2592 is merged.
            invoice.storeId = storeId; // storeId is not a field that we normally have, so we add the Store ID here for convenience.
        }

        invoice.amount = Number(invoice.amount);
        invoice.monitoringExpiration = new Date(invoice.monitoringExpiration * 1000).toISOString();
        invoice.expirationTime = new Date(invoice.expirationTime * 1000).toISOString();
        invoice.createdTime = new Date(invoice.createdTime * 1000).toISOString();
        return invoice;
    },

    getSampleData: function (z, bundle) {
        // Used for testing and setup. Just return the latest invoice in the same format as you'd normally get (see: perform() method).
        const options = {
            url: bundle.authData.server_url + '/api/v1/stores/' + bundle.inputData.store_id + '/invoices',
            method: 'GET',
            params: {},
            body: {},
        };

        return z.request(options).then((response) => {
            let results = response.json;

            for (let i = 0; i < results.length; i++) {
                results[i] = module.exports.format(results[i], bundle.inputData.store_id);
            }
            return results;
        });
    },

    setStatus: async function (z, bundle, invoice_id, newStatus) {
        const options = {
            url: bundle.authData.server_url + '/api/v1/stores/' + bundle.inputData.store_id + '/invoices/' + invoice_id + '/status',
            method: 'POST',
            params: {},
            body: {
                status: newStatus
            }
        };

        let response = await z.request(options);
        if (response.status === 200) {
            return this.format(response.json, bundle.inputData.store_id);
        } else if (response.status === 403) {
            throw new z.errors.Error('Forbidden. Invoice could not be marked as invalid.', 'Forbidden', response.status);
        } else {
            let errorMsg = 'Error: ';
            for (let i = 0; i < response.json.length; i++) {
                errorMsg += response.json[i].message + ', ';
            }
            throw new z.errors.Error(errorMsg, 'InvalidData', response.status);
        }
    },

    outputFields: [
        {key: 'id', label: 'Invoice ID', type: 'string'},
        {key: 'metadata__orderId', label: 'Order ID', type: 'string'},
        {key: 'metadata__posData', label: 'POS Data', type: 'string'},
        {key: 'metadata__itemDesc', label: 'Item Description', type: 'string'},
        {key: 'metadata__buyerEmail', label: 'Buyer Email', type: 'string'},
        {key: 'metadata__buyerName', label: 'Buyer Name', type: 'string'},
        {key: 'metadata__physical', label: 'Is Physical', type: 'boolean'},
        {key: 'metadata__taxIncluded', label: 'Tax Amount Included', type: 'boolean'}, // TODO This field is not in the Greenfield API docs. Should we remove it using format() ?
        {key: 'checkout__speedPolicy', label: 'Speed Policy', type: 'string'},
        {key: 'checkout__paymentMethods[]', label: 'Payment Method', type: 'string'},
        {key: 'checkout__expirationMinutes', label: 'Expiration Minutes', type: 'string'},
        {key: 'checkout__monitoringMinutes', label: 'Monitoring Minutes', type: 'string'},
        {key: 'checkout__paymentTolerance', label: 'Payment Tolerance', type: 'number'},
        {key: 'checkout__redirectURL', label: 'Redirect URL', type: 'string'},
        {key: 'checkout__redirectAutomatically', label: 'Redirect Automatically', type: 'boolean'},
        {key: 'checkout__defaultLanguage', label: 'Default Language', type: 'string'}, // TODO This field may be abandoned once we have auto language detection? Should we remove it using format() ?
        {key: 'checkoutLink', label: 'Payment URL', type: 'string'},
        {key: 'status', label: 'Status', type: 'string'},
        {key: 'additionalStatus', label: 'Additional Status', type: 'string'},
        {key: 'createdTime', label: 'Invoice Created At', type: 'datetime'},
        {key: 'amount', label: 'Amount', type: 'number'},
        {key: 'currency', label: 'Currency', type: 'string'},
        {key: 'expirationTime', label: 'Invoice Expiration', type: 'datetime'},
        {key: 'monitoringExpiration', label: 'Monitoring Expiration', type: 'datetime'},
    ],
    sample: {
        "id": "VDdmfYJzJm9VtqW8hqhypF",
        "checkoutLink": ":censored:25:c3b580afa6:/i/VDdmfYJzJm9VtqW8hqhypF",
        "status": "Expired",
        "additionalStatus": "None",
        "createdTime": "2021-07-08T12:17:24.000Z",
        "expirationTime": "2021-07-08T12:32:24.000Z",
        "monitoringExpiration": "2021-07-08T13:17:24.000Z",
        "amount": 6.15,
        "currency": "EUR",
        "metadata": {},
        "checkout": {
            "speedPolicy": "MediumSpeed",
            "paymentMethods": ["BTC", "BTC-LightningNetwork"],
            "expirationMinutes": 15,
            "monitoringMinutes": 60,
            "paymentTolerance": 0.0,
            "redirectURL": null,
            "redirectAutomatically": false,
            "defaultLanguage": null
        }
    }
}