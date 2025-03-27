import React, { useState } from 'react';

const CheckoutForm = ({ onSubmit }) => {
    const [formData, setFormData] = useState({
        code: '',
        cardNumber: '',
        cardType: '',
        expiryMonth: '10',
        expiryYear: '2030',
        cvv: '123'
    });

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [id]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const paymentData = {
            cardDetails: {
                cardNumber: formData.cardNumber,
                expiryMonth: formData.expiryMonth,
                expiryYear: formData.expiryYear,
                type: formData.cardType,
                cvv: formData.cvv
            },
            clientReferenceInformation: {
                code: formData.code
            }
        };

        onSubmit(paymentData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className="block mb-2 font-semibold">Client reference info code</label>
            <input
                type="text"
                id="code"
                className="w-full border p-2 mb-4 rounded"
                placeholder="2021102509"
                value={formData.code}
                onChange={handleChange}
                required
            />

            <label className="block mb-2 font-semibold">Número do Cartão</label>
            <input
                type="text"
                id="cardNumber"
                className="w-full border p-2 mb-4 rounded"
                placeholder="0000 0000 0000 0000"
                value={formData.cardNumber}
                onChange={handleChange}
                required
            />

            <label className="block mb-2 font-semibold">Tipo do Cartão</label>
            <input
                type="text"
                id="cardType"
                className="w-full border p-2 mb-4 rounded"
                placeholder="001"
                value={formData.cardType}
                onChange={handleChange}
                required
            />

            <label className="block mb-2 font-semibold">Data de Validade</label>
            <div className="flex gap-4 mb-4">
                <input
                    type="text"
                    id="expiryMonth"
                    className="border p-2 rounded w-1/2"
                    placeholder="MM"
                    value={formData.expiryMonth}
                    onChange={handleChange}
                    required
                />
                <input
                    type="text"
                    id="expiryYear"
                    className="border p-2 rounded w-1/2"
                    placeholder="YYYY"
                    value={formData.expiryYear}
                    onChange={handleChange}
                    required
                />
            </div>

            <label className="block mb-2 font-semibold">Código de Segurança (CVV)</label>
            <input
                type="text"
                id="cvv"
                className="w-full border p-2 mb-4 rounded"
                placeholder="123"
                value={formData.cvv}
                onChange={handleChange}
                required
            />

            <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
            >
                Pagar
            </button>
        </form>
    );
};

export default CheckoutForm; 