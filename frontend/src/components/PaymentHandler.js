import axios from 'axios';
import React, { useEffect, useState } from 'react';

// Utility function to decode base64 URL
const base64UrlDecode = (input) => {
    try {
        // Add padding if needed
        let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) {
            if (pad === 1) {
                throw new Error('Invalid padding');
            }
            base64 += new Array(5 - pad).join('=');
        }

        const decodedData = atob(base64);
        return JSON.parse(decodedData);
    } catch (error) {
        console.error("Error decoding base64URL:", error);
        return { challengeWindowSize: "01" }; // Default to smallest size
    }
};

const PaymentHandler = ({
    paymentData,
    setupPayerAuthData,
    setSetupPayerAuthData,
    isDeviceDataCollected,
    enrollmentData,
    setEnrollmentData,
    transactionId,
    ddcIframeRef
}) => {
    const [validationStatus, setValidationStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const clientId = "f9561d17-2c3e-4878-8831-987575b2ad44";
    const clientKey = "8127bd6473c5b7675649ac05e55891caa1006181";
    const API_URL = 'http://localhost:8123/sandbox/antifraud/3ds';

    // Step 1: Setup Payer Auth
    useEffect(() => {
        if (paymentData && !setupPayerAuthData) {
            setupPayerAuth();
        }
    }, [paymentData, setupPayerAuthData]);

    // Step 2: Handle Device Data Collection result
    useEffect(() => {
        if (setupPayerAuthData && isDeviceDataCollected && !enrollmentData) {
            performEnrollment();
        }
    }, [setupPayerAuthData, isDeviceDataCollected, enrollmentData]);

    // Step 3: Handle Transaction ID (final step)
    useEffect(() => {
        if (transactionId) {
            setIsProcessing(true);
            validateAuthenticationResult(transactionId)
                .then((validationData) => {
                    setValidationStatus(validationData);
                    return completeTransaction(transactionId);
                })
                .catch(error => {
                    console.error("Error in authentication validation:", error);
                    setValidationStatus({ status: "ERROR", error });
                })
                .finally(() => {
                    setIsProcessing(false);
                });
        }
    }, [transactionId]);

    const setupPayerAuth = async () => {
        try {
            const payload = {
                clientReferenceInformation: { code: paymentData.clientReferenceInformation.code },
                merchant: { name: "Loja do Lojista", cnpj: "0561203165498", mcc: "2999" },
                paymentInformation: {
                    card: {
                        type: paymentData.cardDetails.type,
                        number: paymentData.cardDetails.cardNumber,
                        expirationMonth: paymentData.cardDetails.expiryMonth,
                        expirationYear: paymentData.cardDetails.expiryYear,
                        bin: "12123123123"
                    },
                },
            };

            console.log("Setup Payer Auth payload:", payload);

            // Fazer chamada diretamente para o backend Java
            const response = await axios.post(`${API_URL}/setup`, payload, {
                headers: {
                    "Content-Type": "application/json",
                    "ClientId": clientId,
                    "ClientKey": clientKey,
                },
            });

            const data = response.data;
            console.log("Setup Payer Auth response:", data);
            setSetupPayerAuthData(data);

            // Submit the DDC form through the iframe
            if (ddcIframeRef.current && data.consumerAuthenticationInformation) {
                const ddcForm = document.createElement('form');
                ddcForm.method = 'POST';
                ddcForm.action = data.consumerAuthenticationInformation.deviceDataCollectionUrl;
                ddcForm.target = 'ddc-iframe';

                const jwtInput = document.createElement('input');
                jwtInput.type = 'hidden';
                jwtInput.name = 'JWT';
                jwtInput.value = data.consumerAuthenticationInformation.accessToken;

                ddcForm.appendChild(jwtInput);
                document.body.appendChild(ddcForm);
                ddcForm.submit();
                document.body.removeChild(ddcForm);
            }
        } catch (error) {
            console.error("Error in setupPayerAuth:", error);
        }
    };

    const performEnrollment = async () => {
        try {
            // Get screen properties using window.screen to avoid linting errors
            const screenColorDepth = window.screen?.colorDepth?.toString() || "24";
            const screenHeight = window.screen?.height?.toString() || "900";
            const screenWidth = window.screen?.width?.toString() || "1440";

            const enrollmentPayload = {
                clientReferenceInformation: {
                    code: paymentData.clientReferenceInformation.code
                },
                orderInformation: {
                    amountDetails: {
                        currency: "BRL",
                        totalAmount: "10.99",
                    },
                    lineItems: [
                        {
                            "unitPrice": 50.0,
                            "quantity": 2,
                            "productSKU": "SKU123",
                            "productName": "Produto A",
                            "productCode": "CODE123"
                        },
                        {
                            "unitPrice": 30.0,
                            "quantity": 3,
                            "productSKU": "SKU456",
                            "productName": "Produto B",
                            "productCode": "CODE456"
                        },
                        {
                            "unitPrice": 120.0,
                            "quantity": 1,
                            "productSKU": "SKU789",
                            "productName": "Produto C",
                            "productCode": "CODE789"
                        }
                    ],
                    billTo: {
                        address1: "1 Market St",
                        address2: "Suite 100",
                        administrativeArea: "CA",
                        country: "US",
                        locality: "san francisco",
                        firstName: "John",
                        lastName: "Doe",
                        phoneNumber: "4158880000",
                        email: "test@cybs.com",
                        postalCode: "94105"
                    },
                    shipTo: {
                        address1: "1 Market St",
                        address2: "Suite 100",
                        administrativeArea: "CA",
                        country: "US",
                        locality: "san francisco",
                        firstName: "John",
                        lastName: "Doe",
                        phoneNumber: "4158880000",
                        email: "test@cybs.com",
                        postalCode: "94105"
                    }
                },
                paymentInformation: {
                    card: {
                        type: paymentData.cardDetails.type,
                        expirationMonth: paymentData.cardDetails.expiryMonth,
                        expirationYear: paymentData.cardDetails.expiryYear,
                        number: paymentData.cardDetails.cardNumber,
                        bin: "12123123123"
                    }
                },
                buyerInformation: {
                    merchantCustomerId: "",
                    mobilePhone: "5548998009100"
                },
                deviceInformation: {
                    ipAddress: "",
                    httpAcceptBrowserValue: navigator.userAgent,
                    httpAcceptContent: navigator.mimeTypes.length > 0 ? navigator.mimeTypes[0].type : "",
                    httpBrowserLanguage: navigator.language,
                    httpBrowserJavaEnabled: navigator.javaEnabled(),
                    httpBrowserJavaScriptEnabled: true,
                    httpBrowserColorDepth: screenColorDepth,
                    httpBrowserScreenHeight: screenHeight,
                    httpBrowserScreenWidth: screenWidth,
                    httpBrowserTimeDifference: new Date().getTimezoneOffset().toString(),
                    userAgentBrowserValue: navigator.userAgent,
                    fingerprintSessionId: "your-fingerprint-session-id"
                },
                merchantInformation: {
                    merchantDescriptor: {
                        url: window.location.origin
                    },
                    merchantName: "Loja do Lojista"
                },
                acquirerInformation: {
                    acquirerBin: "",
                    merchantId: ""
                },
                consumerAuthenticationInformation: {
                    deviceChannel: "browser",
                    mcc: "2999",
                    messageCategory: "01",
                    overridePaymentMethod: "",
                    productCode: "",
                    returnUrl: "http://localhost:5000/challenge-response",
                    requestorId: "",
                    requestorName: "",
                    referenceId: setupPayerAuthData.consumerAuthenticationInformation.referenceId || "",
                    transactionMode: "MOTO"
                },
                merchant: {
                    name: "Loja do Lojista",
                    cnpj: "0561203165498",
                    mcc: "2999"
                }
            };

            console.log("Enrollment payload:", enrollmentPayload);

            // Chamada direta para o backend Java
            const response = await axios.post(`${API_URL}/authentications`, enrollmentPayload, {
                headers: {
                    "Content-Type": "application/json",
                    "ClientId": clientId,
                    "ClientKey": clientKey,
                },
            });

            const data = response.data;
            console.log("Enrollment response:", data);

            if (data.consumerAuthenticationInformation) {
                try {
                    // Check if paReq exists (it should if PENDING_AUTHENTICATION)
                    if (data.status === 'PENDING_AUTHENTICATION' && data.consumerAuthenticationInformation.pareq) {
                        console.log("Authentication pending, pareq available:", data.consumerAuthenticationInformation.pareq);

                        // Decode the paReq
                        const pareqDecoded = base64UrlDecode(data.consumerAuthenticationInformation.pareq);
                        console.log("Decoded pareq:", pareqDecoded);

                        const challengeWindowSize = pareqDecoded.challengeWindowSize || "01";

                        // Map iframe dimensions based on the challenge window size
                        const iframeDimensions = {
                            "01": { width: 250, height: 400 },
                            "02": { width: 390, height: 400 },
                            "03": { width: 500, height: 600 },
                            "04": { width: 600, height: 400 },
                            "05": { width: "100%", height: "100%" }
                        };

                        const dimensions = iframeDimensions[challengeWindowSize];
                        console.log("Challenge window size:", challengeWindowSize, "dimensions:", dimensions);

                        // Importante: Garantir que o stepUpUrl e accessToken estejam presentes
                        if (!data.consumerAuthenticationInformation.stepUpUrl || !data.consumerAuthenticationInformation.accessToken) {
                            console.error("Missing required fields for 3DS challenge:", data.consumerAuthenticationInformation);
                            return;
                        }

                        // Store enrollment data with dimensions for the iframe
                        setEnrollmentData({
                            ...data,
                            dimensions
                        });
                    } else {
                        // Handle non-challenge response
                        console.log("Authentication status:", data.status);
                        setEnrollmentData({
                            ...data,
                            dimensions: { width: 0, height: 0 }
                        });
                    }
                } catch (error) {
                    console.error("Error processing 3DSecure challenge:", error);
                }
            }
        } catch (error) {
            console.error("Error in performEnrollment:", error);
        }
    };

    const validateAuthenticationResult = async (transId) => {
        try {
            console.log("Validating authentication result with transactionId:", transId);

            const validationPayload = {
                clientReferenceInformation: {
                    code: paymentData.clientReferenceInformation.code
                },
                consumerAuthenticationInformation: {
                    authenticationTransactionId: transId
                }
            };

            console.log("Authentication validation payload:", validationPayload);

            // Chamada para validar o resultado da autenticação
            const response = await axios.post(`${API_URL}/authentication-results`, validationPayload, {
                headers: {
                    "Content-Type": "application/json",
                    "ClientId": clientId,
                    "ClientKey": clientKey,
                }
            });

            const data = response.data;
            console.log("Authentication validation response:", data);

            return data;
        } catch (error) {
            console.error("Error validating authentication result:", error);
            throw error;
        }
    };

    const completeTransaction = async (transId) => {
        try {
            // Chamada direta para o backend Java
            const response = await axios.post(`${API_URL}/complete`, {
                transactionId: transId
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "ClientId": clientId,
                    "ClientKey": clientKey,
                }
            });

            console.log("Transaction completion response:", response.data);
        } catch (error) {
            console.error("Error completing transaction:", error);
        }
    };

    // Render payment status based on current state
    return (
        <div className="p-4 border rounded mt-4">
            {!setupPayerAuthData && <p>Iniciando verificação de segurança...</p>}

            {setupPayerAuthData && !isDeviceDataCollected && (
                <p>Coletando dados do dispositivo...</p>
            )}

            {isDeviceDataCollected && !enrollmentData && (
                <p>Verificando autenticação...</p>
            )}

            {enrollmentData && enrollmentData.status === 'PENDING_AUTHENTICATION' && !transactionId && (
                <div>
                    <p className="mb-4 font-semibold">Autenticação requerida. Por favor, complete o desafio de segurança abaixo.</p>
                </div>
            )}

            {transactionId && isProcessing && (
                <div className="text-blue-600 font-semibold">
                    <p>Validando resultado da autenticação...</p>
                </div>
            )}

            {validationStatus && validationStatus.status === "ERROR" && (
                <div className="text-red-600 font-bold">
                    <p>Erro na validação da autenticação</p>
                </div>
            )}

            {validationStatus && validationStatus.status !== "ERROR" && (
                <div className="text-green-600 font-bold">
                    <p>Autenticação validada com sucesso!</p>
                    <p className="text-sm mt-2">Status: {validationStatus.status}</p>
                    <p className="text-sm">ECI: {validationStatus.consumerAuthenticationInformation?.eci || "N/A"}</p>
                </div>
            )}

            {enrollmentData && enrollmentData.status === 'AUTHENTICATION_SUCCESSFUL' && (
                <div className="text-green-600 font-bold">
                    <p>Autenticação concluída com sucesso!</p>
                </div>
            )}

            {transactionId && !isProcessing && (
                <div className="text-green-600 font-bold">
                    <p>Pagamento concluído com sucesso!</p>
                    <p className="text-sm mt-2">TransactionID: {transactionId}</p>
                </div>
            )}
        </div>
    );
};

export default PaymentHandler; 