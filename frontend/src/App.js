import React, { useEffect, useRef, useState } from 'react';
import CheckoutForm from './components/CheckoutForm';
import PaymentHandler from './components/PaymentHandler';

function App() {
    const [paymentData, setPaymentData] = useState(null);
    const [setupPayerAuthData, setSetupPayerAuthData] = useState(null);
    const [isDeviceDataCollected, setIsDeviceDataCollected] = useState(false);
    const [enrollmentData, setEnrollmentData] = useState(null);
    const [transactionId, setTransactionId] = useState(null);
    const ddcIframeRef = useRef(null);

    // This effect handles messages from iframes
    useEffect(() => {
        const handleMessage = (event) => {
            console.log("Message received from origin:", event.origin);

            // Handle device data collection messages
            if (event.origin === "https://centinelapistag.cardinalcommerce.com") {
                try {
                    let data = JSON.parse(event.data);
                    console.log("Message received from Device Data Collection:", data);

                    if (data.Status === true) {
                        console.log("DDC Status: Success");
                        setIsDeviceDataCollected(true);
                    }
                } catch (error) {
                    console.error("Error parsing message:", error);
                }
            }

            // Handle challenge completion messages
            if (event.origin === "https://centinelapistag.cardinalcommerce.com") {
                try {
                    let responseData = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

                    if (responseData && responseData.TransactionId) {
                        console.log("Transaction completed successfully:", responseData.TransactionId);
                        setTransactionId(responseData.TransactionId);
                    }
                } catch (error) {
                    console.error("Error processing challenge message:", error);
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // Check for TransactionId in URL params on component mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const transId = urlParams.get("TransactionId");

        if (transId) {
            setTransactionId(transId);
            console.log("Transaction ID found in URL:", transId);
        }
    }, []);

    // Efeito para submeter o formulário de desafio - agora insere o HTML diretamente
    useEffect(() => {
        if (enrollmentData &&
            enrollmentData.status === 'PENDING_AUTHENTICATION' &&
            enrollmentData.consumerAuthenticationInformation &&
            enrollmentData.consumerAuthenticationInformation.stepUpUrl &&
            enrollmentData.consumerAuthenticationInformation.accessToken) {

            console.log("Setting up 3DS challenge");

            // Remover iframe e form anteriores se existirem
            const oldIframe = document.getElementById('step-up-iframe');
            const oldForm = document.getElementById('step-up-form');
            if (oldIframe) oldIframe.remove();
            if (oldForm) oldForm.remove();

            // Criar elemento container para o desafio
            const challengeContainer = document.getElementById('challenge-container');
            if (!challengeContainer) return;

            // Limpar o container
            challengeContainer.innerHTML = '';

            // Criar iframe exatamente conforme a documentação
            const iframe = document.createElement('iframe');
            iframe.name = 'step-up-iframe';
            iframe.id = 'step-up-iframe';
            iframe.height = enrollmentData.dimensions?.height || 400;
            iframe.width = enrollmentData.dimensions?.width || 250;
            iframe.style.border = '1px solid #ccc';
            iframe.style.margin = '20px auto';
            iframe.style.display = 'block';

            // Adicionar o iframe ao container primeiro
            challengeContainer.appendChild(iframe);

            // Criar formulário exatamente conforme a documentação
            const form = document.createElement('form');
            form.id = 'step-up-form';
            form.target = 'step-up-iframe';
            form.method = 'POST';
            form.action = enrollmentData.consumerAuthenticationInformation.stepUpUrl;

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'JWT';
            input.value = enrollmentData.consumerAuthenticationInformation.accessToken;

            // Adicionar o input ao form
            form.appendChild(input);

            // Adicionar o form ao container DEPOIS do iframe
            challengeContainer.appendChild(form);

            // Adicionar script para submeter o formulário
            const script = document.createElement('script');
            script.textContent = `
                window.onload = function() {
                    var stepUpForm = document.getElementById('step-up-form');
                    if (stepUpForm) {
                        console.log('Submitting step-up form automatically');
                        stepUpForm.submit();
                    }
                }
                
                // Se a página já estiver carregada, submeter imediatamente
                if (document.readyState === 'complete') {
                    var stepUpForm = document.getElementById('step-up-form');
                    if (stepUpForm) {
                        console.log('Window already loaded, submitting step-up form');
                        stepUpForm.submit();
                    }
                }
            `;

            // Adicionar o script ao body
            document.body.appendChild(script);

            // Submeter o formulário automaticamente após um pequeno delay
            setTimeout(() => {
                const stepUpForm = document.getElementById('step-up-form');
                if (stepUpForm) {
                    console.log('Submitting form after delay');
                    stepUpForm.submit();
                }
            }, 100);
        }
    }, [enrollmentData]);

    return (
        <div className="p-10">
            <div className="max-w-lg mx-auto bg-white shadow-lg rounded-lg p-8">
                <h1 className="text-2xl font-bold mb-4">Checkout Seguro</h1>

                {!paymentData && (
                    <CheckoutForm
                        onSubmit={setPaymentData}
                    />
                )}

                {paymentData && (
                    <PaymentHandler
                        paymentData={paymentData}
                        setupPayerAuthData={setupPayerAuthData}
                        setSetupPayerAuthData={setSetupPayerAuthData}
                        isDeviceDataCollected={isDeviceDataCollected}
                        enrollmentData={enrollmentData}
                        setEnrollmentData={setEnrollmentData}
                        transactionId={transactionId}
                        ddcIframeRef={ddcIframeRef}
                    />
                )}

                {/* Device Data Collection iframe */}
                <iframe
                    ref={ddcIframeRef}
                    name="ddc-iframe"
                    height="1"
                    width="1"
                    style={{ display: 'none' }}
                    title="Device Data Collection"
                />

                {/* Container para o desafio 3DS */}
                {enrollmentData &&
                    enrollmentData.status === 'PENDING_AUTHENTICATION' && (
                        <div className="mt-4 p-2 border rounded">
                            <p className="mb-4 font-semibold">Autenticação requerida. Por favor, complete o desafio de segurança abaixo.</p>
                            <div id="challenge-container"></div>
                        </div>
                    )}
            </div>
        </div>
    );
}

export default App; 