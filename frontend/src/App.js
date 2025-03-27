import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import CheckoutForm from './components/CheckoutForm';

function App() {
    const [paymentData, setPaymentData] = useState(null);
    const [setupPayerAuthData, setSetupPayerAuthData] = useState(null);
    const [isDeviceDataCollected, setIsDeviceDataCollected] = useState(false);
    const [enrollmentData, setEnrollmentData] = useState(null);
    const [transactionId, setTransactionId] = useState(null);
    const ddcIframeRef = useRef(null);
    const clientId = "f9561d17-2c3e-4878-8831-987575b2ad44";
    const clientKey = "8127bd6473c5b7675649ac05e55891caa1006181";
    const API_URL = 'http://localhost:8123/sandbox/antifraud/3ds';
    const [validationStatus, setValidationStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState('form');

    // 1. Monitoramento de mensagens dos iframes
    useEffect(() => {
        console.log("[1] Configurando listener para mensagens 3DS...");

        const handleMessage = (event) => {
            console.log(`[2] Mensagem recebida de: ${event.origin}`);

            if (event.origin === "https://centinelapistag.cardinalcommerce.com") {
                try {
                    const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                    console.log("[3] Conteúdo da mensagem:", data);

                    if (data.Status === true) {
                        console.log("[4] DDC completado com sucesso!");
                        setIsDeviceDataCollected(true);
                        setCurrentStep('enrollment');
                    }

                    if (data?.TransactionId) {
                        console.log(`[5] Transação completada! ID: ${data.TransactionId}`);
                        setTransactionId(data.TransactionId);
                        setCurrentStep('validation');
                    }
                } catch (error) {
                    console.error("[ERRO] Ao processar mensagem:", error);
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => {
            console.log("[6] Removendo listener de mensagens");
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    // 2. Verificação inicial da URL
    useEffect(() => {
        console.log("[7] Verificando parâmetros da URL...");
        const urlParams = new URLSearchParams(window.location.search);
        const transId = urlParams.get("TransactionId");

        if (transId) {
            console.log(`[8] TransactionId encontrado na URL: ${transId}`);
            setTransactionId(transId);
            setCurrentStep('validation');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // 3. Fluxo Principal
    useEffect(() => {
        console.log(`[9] Etapa atual: ${currentStep}`);
    }, [currentStep]);

    // 4. Setup Payer Auth
    useEffect(() => {
        if (paymentData && !setupPayerAuthData) {
            console.log("[10] Iniciando Setup Payer Auth...");
            setCurrentStep('ddc');
            setupPayerAuth();
        }
    }, [paymentData, setupPayerAuthData]);

    const setupPayerAuth = async () => {
        try {
            console.log("[11] Preparando payload para Setup Payer Auth...");
            const payload = {
                clientReferenceInformation: { code: paymentData.clientReferenceInformation.code },
                merchant: { name: "Loja do Lojista", cnpj: "0561203165498", mcc: "2999" },
                paymentInformation: {
                    card: {
                        type: paymentData.cardDetails.type,
                        number: paymentData.cardDetails.cardNumber,
                        expirationMonth: paymentData.cardDetails.expiryMonth,
                        expirationYear: paymentData.cardDetails.expiryYear,
                        bin: paymentData.cardDetails.cardNumber.substring(0, 6)
                    },
                },
            };

            console.log("[12] Enviando para /setup...");
            const response = await axios.post(`${API_URL}/setup`, payload, {
                headers: {
                    "Content-Type": "application/json",
                    "ClientId": clientId,
                    "ClientKey": clientKey,
                },
            });

            console.log("[13] Resposta do Setup:", response.data);
            setSetupPayerAuthData(response.data);

            if (response.data.consumerAuthenticationInformation) {
                console.log("[14] Configurando DDC iframe...");
                const ddcForm = document.createElement('form');
                ddcForm.method = 'POST';
                ddcForm.action = response.data.consumerAuthenticationInformation.deviceDataCollectionUrl;
                ddcForm.target = 'ddc-iframe';

                const jwtInput = document.createElement('input');
                jwtInput.type = 'hidden';
                jwtInput.name = 'JWT';
                jwtInput.value = response.data.consumerAuthenticationInformation.accessToken;

                ddcForm.appendChild(jwtInput);
                document.body.appendChild(ddcForm);
                ddcForm.submit();
                document.body.removeChild(ddcForm);
            }
        } catch (error) {
            console.error("[ERRO] Setup Payer Auth:", error.response?.data || error.message);
            setCurrentStep('error');
        }
    };

    // 5. Enrollment
    useEffect(() => {
        if (setupPayerAuthData && isDeviceDataCollected && !enrollmentData) {
            console.log("[15] Iniciando Enrollment...");
            performEnrollment();
        }
    }, [setupPayerAuthData, isDeviceDataCollected, enrollmentData]);

    const performEnrollment = async () => {
        try {
            console.log("[16] Preparando payload para Enrollment...");
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
                        bin: paymentData.cardDetails.cardNumber.substring(0, 6) // Extrai BIN do número do cartão
                    }
                },
                buyerInformation: {
                    merchantCustomerId: "",
                    mobilePhone: "5548998009100"
                },
                deviceInformation: {
                    ipAddress: "", // Você pode querer preencher isso com o IP real
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

            console.log("[17] Enviando para /authentications...");
            const response = await axios.post(`${API_URL}/authentications`, enrollmentPayload, {
                headers: {
                    "Content-Type": "application/json",
                    "ClientId": clientId,
                    "ClientKey": clientKey,
                },
            });

            console.log("[18] Resposta do Enrollment:", response.data);
            setEnrollmentData(response.data);

            if (response.data.status === 'PENDING_AUTHENTICATION') {
                console.log("[19] Autenticação pendente - preparando iframe de desafio");
                setCurrentStep('challenge');
            } else if (response.data.status === 'AUTHENTICATION_SUCCESSFUL') {
                console.log("[20] Autenticação concluída com sucesso");
                setCurrentStep('success');
            } else if (response.data.status === 'AUTHENTICATION_FAILED') {
                console.log("[20] Autenticação falhou");
                setCurrentStep('authentication_failed');
            }
        } catch (error) {
            console.error("[ERRO] Enrollment:", error.response?.data || error.message);
            setCurrentStep('error');
        }
    };

    // 6. Iframe de Desafio
    useEffect(() => {
        if (!enrollmentData || enrollmentData.status !== 'PENDING_AUTHENTICATION') return;

        console.log("[21] Configurando iframe de desafio...");
        const { stepUpUrl, accessToken } = enrollmentData.consumerAuthenticationInformation || {};

        if (!stepUpUrl || !accessToken) {
            console.error("[ERRO] Dados incompletos para desafio");
            return;
        }

        const challengeContainer = document.getElementById('challenge-container');
        if (!challengeContainer) return;

        challengeContainer.innerHTML = '';

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = stepUpUrl;
        form.target = 'challenge-iframe';
        form.style.display = 'none';

        const jwtInput = document.createElement('input');
        jwtInput.type = 'hidden';
        jwtInput.name = 'JWT';
        jwtInput.value = accessToken;
        form.appendChild(jwtInput);

        const iframe = document.createElement('iframe');
        iframe.name = 'challenge-iframe';
        iframe.id = 'challenge-iframe';
        iframe.style.width = '100%';
        iframe.style.height = '500px';
        iframe.style.border = '1px solid #ddd';
        iframe.style.borderRadius = '8px';
        iframe.style.margin = '0 auto';
        iframe.style.display = 'block';

        challengeContainer.appendChild(form);
        challengeContainer.appendChild(iframe);

        console.log("[22] Submetendo formulário de desafio...");
        setTimeout(() => form.submit(), 100);

        return () => {
            challengeContainer.innerHTML = '';
        };
    }, [enrollmentData]);

    // 7. Validação Final
    useEffect(() => {
        if (transactionId && !validationStatus) {
            console.log(`[23] Validando transação ${transactionId}...`);
            setIsProcessing(true);
            validateAuthenticationResult(transactionId)
                .then((validationData) => {
                    console.log("[24] Validação concluída:", validationData);
                    setValidationStatus(validationData);
                    setIsProcessing(false);

                    if (validationData.status === 'AUTHENTICATION_SUCCESSFUL') {
                        setCurrentStep('success');
                    } else if (validationData.status === 'AUTHENTICATION_FAILED') {
                        setCurrentStep('authentication_failed');
                    } else {
                        setCurrentStep('error');
                    }
                })
                .catch(error => {
                    console.error("[ERRO] Validação:", error.response?.data || error.message);
                    setValidationStatus({ status: "ERROR", error });
                    setIsProcessing(false);
                    setCurrentStep('error');
                });
        }
    }, [transactionId]);

    const validateAuthenticationResult = async (transId) => {
        try {
            console.log("[25] Preparando payload para validação...");
            const validationPayload = {
                clientReferenceInformation: {
                    code: paymentData?.clientReferenceInformation?.code
                },
                consumerAuthenticationInformation: {
                    authenticationTransactionId: transId
                }
            };

            console.log("[26] Enviando para /authentication-results...");
            const response = await axios.post(`${API_URL}/authentication-results`, validationPayload, {
                headers: {
                    "Content-Type": "application/json",
                    "ClientId": clientId,
                    "ClientKey": clientKey,
                }
            });

            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 'form':
                return <CheckoutForm onSubmit={setPaymentData} />;

            case 'ddc':
                return (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Coletando dados de segurança do dispositivo...</p>
                    </div>
                );

            case 'enrollment':
                return (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Verificando autenticação 3D Secure...</p>
                    </div>
                );

            case 'challenge':
                return (
                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4">Verificação de Segurança</h3>
                        <div id="challenge-container" className="flex justify-center"></div>
                        <p className="text-sm text-gray-500 mt-2 text-center">
                            Siga as instruções no quadro acima para completar a autenticação
                        </p>
                    </div>
                );

            case 'validation':
                return (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Validando resultado da autenticação...</p>
                    </div>
                );

            case 'success':
                return (
                    <div className="text-center py-8">
                        {/* Ícone de sucesso com fundo verde */}
                        <div style={{
                            backgroundColor: '#d1fae5', // Verde claro de fundo
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#10b981" // Verde mais escuro
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>

                        <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '500',
                            color: '#10b981', // Verde
                            marginBottom: '8px'
                        }}>
                            Pagamento autorizado com sucesso!
                        </h3>
                    </div>
                );

            case 'authentication_failed':
                return (
                    <div className="text-center py-8">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-yellow-600 mb-2">Autenticação Falhou</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Não foi possível completar a autenticação do seu cartão. Por favor, tente novamente ou use outro método de pagamento.
                        </p>
                        <button
                            onClick={() => {
                                setPaymentData(null);
                                setSetupPayerAuthData(null);
                                setIsDeviceDataCollected(false);
                                setEnrollmentData(null);
                                setTransactionId(null);
                                setValidationStatus(null);
                                setCurrentStep('form');
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                );

            case 'error':
                return (
                    <div className="text-center py-8">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-red-600 mb-2">Erro no processamento</h3>
                        <p className="text-sm text-gray-500">
                            {validationStatus?.error?.message || "Ocorreu um erro durante a autenticação"}
                        </p>
                    </div>
                );

            default:
                return <CheckoutForm onSubmit={setPaymentData} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-600 py-4 px-6">
                    <h1 className="text-xl font-semibold text-white">Checkout Seguro</h1>
                </div>

                <div className="p-6">
                    {/* Progress indicator */}
                    <div className="flex items-center justify-between mb-6">
                        {['form', 'ddc', 'challenge', 'success'].map((step, index) => (
                            <div key={step} className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center 
    ${['form', 'ddc', 'challenge', 'success'].indexOf(step) <=
                                        ['form', 'ddc', 'challenge', 'success'].indexOf(currentStep) ?
                                        'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {index + 1}
                                </div>
                                <span className="text-xs mt-1 text-gray-500 capitalize">{step}</span>
                            </div>
                        ))}
                    </div>

                    {/* Main content */}
                    {renderStepContent()}

                    {/* Hidden iframe for DDC */}
                    <iframe
                        ref={ddcIframeRef}
                        name="ddc-iframe"
                        height="1"
                        width="1"
                        style={{ display: 'none' }}
                        title="Device Data Collection"
                    />
                </div>
            </div>
        </div>
    );
}

export default App;