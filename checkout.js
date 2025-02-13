// Variáveis globais para armazenar dados importantes
let setupPayerAuthData = null;
let cardDetails = null;

document.getElementById("checkout-form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Capturar os dados do formulário
    cardDetails = {
        cardNumber: document.getElementById("card-number").value,
        expiryMonth: document.getElementById("expiry-month").value,
        expiryYear: document.getElementById("expiry-year").value,
        cvv: document.getElementById("cvv").value
    };

    // Montar o payload para a chamada de Setup Payer Auth
    const payload = {
        clientReferenceInformation: { code: "123456" },
        merchant: { name: "Loja do Lojista", cnpj: "0561203165498", mcc: "2999" },
        paymentInformation: {
            card: {
                type: "001", // Tipo de cartão (VISA)
                number: cardDetails.cardNumber,
                expirationMonth: cardDetails.expiryMonth,
                expirationYear: cardDetails.expiryYear,
                bin: "12123123123"
            },
        },
    };

    try {
        // Enviar a requisição para o endpoint de Setup Payer Auth
        const response = await fetch("http://localhost:8123/sandbox/antifraud/3ds/setup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ClientId": "f9561d17-2c3e-4878-8831-987575b2ad44",
                "ClientKey": "8127bd6473c5b7675649ac05e55891caa1006181",
            },
            body: JSON.stringify(payload),
        });

        setupPayerAuthData = await response.json();
        console.log("Resposta do Setup Payer Auth:", setupPayerAuthData);

        // Configurar o JWT recebido no iframe de coleta de dados
        document.getElementById("jwt-token").value = setupPayerAuthData.consumerAuthenticationInformation.accessToken;
        document.getElementById("ddc-form").setAttribute("action", setupPayerAuthData.consumerAuthenticationInformation.deviceDataCollectionUrl);

        // Submeter o formulário de coleta de dados
        document.getElementById("ddc-form").submit();
    } catch (error) {
        console.error("Erro ao iniciar o Setup Payer Auth:", error);
    }
});

// Listener para capturar mensagens do iframe
window.addEventListener("message", async (event) => {
    if (event.origin === "https://centinelapistag.cardinalcommerce.com") {
        let data = JSON.parse(event.data);
        console.log("Mensagem recebida do Device Data Collection:", data);

        // Verificar se a coleta de dados foi concluída com sucesso
        if (data.Status === true) {
            console.log("DDC Status: Success");
            console.log("setupPayerAuthData:", setupPayerAuthData);
            console.log("cardDetails:", cardDetails);

            if (setupPayerAuthData && cardDetails) {
                console.log("Iniciando chamada de Enrollment...");
                // Realizar a chamada de Enrollment após a coleta de dados
                const enrollmentPayload = {
                    clientReferenceInformation: {
                        code: "cybs_test"
                    },
                    orderInformation: {
                        amountDetails: {
                            currency: "BRL",
                            totalAmount: "10.99",
                            lineItems: [
                                {
                                    totalAmount: "10.99"
                                }
                            ]
                        },
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
                            type: "001",
                            expirationMonth: cardDetails.expiryMonth,
                            expirationYear: cardDetails.expiryYear,
                            number: cardDetails.cardNumber,
                            bin: "12123123123"
                        }
                    },
                    buyerInformation: {
                        merchantCustomerId: "",
                        mobilePhone: "1245789632"
                    },
                    deviceInformation: {
                        ipAddress: "",
                        httpAcceptBrowserValue: navigator.userAgent,
                        httpAcceptContent: navigator.mimeTypes.length > 0 ? navigator.mimeTypes[0].type : "",
                        httpBrowserLanguage: navigator.language,
                        httpBrowserJavaEnabled: navigator.javaEnabled(),
                        httpBrowserJavaScriptEnabled: true,
                        httpBrowserColorDepth: screen.colorDepth.toString(),
                        httpBrowserScreenHeight: screen.height.toString(),
                        httpBrowserScreenWidth: screen.width.toString(),
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
                        returnUrl: window.location.href,
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

                try {
                    const enrollmentResponse = await fetch("http://localhost:8123/sandbox/antifraud/3ds/authentications", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "ClientId": "f9561d17-2c3e-4878-8831-987575b2ad44",
                            "ClientKey": "8127bd6473c5b7675649ac05e55891caa1006181",
                        },
                        body: JSON.stringify(enrollmentPayload)
                    });

                    const enrollmentData = await enrollmentResponse.json();
                    console.log("Resposta do Enrollment:", enrollmentData);

                    // Aqui você pode adicionar lógica adicional com base na resposta do Enrollment
                } catch (error) {
                    console.error("Erro ao realizar o Enrollment:", error);
                }
            } else {
                console.log("Condições para chamada de Enrollment não atendidas.");
            }
        }
    }
});
