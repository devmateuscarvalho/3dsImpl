// Variáveis globais para armazenar dados importantes
let setupPayerAuthData = null;
let cardDetails = null;
let clientId = "f9561d17-2c3e-4878-8831-987575b2ad44";
let clientKey = "8127bd6473c5b7675649ac05e55891caa1006181";

document.getElementById("checkout-form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Capturar os dados do formulário
    cardDetails = {
        cardNumber: document.getElementById("card-number").value,
        expiryMonth: document.getElementById("expiry-month").value,
        expiryYear: document.getElementById("expiry-year").value,
        type: document.getElementById("card-type").value,
        cvv: document.getElementById("cvv").value
    };
    clientReferenceInformation = {
        code: document.getElementById("code").value,
    }

    prePayload = {
        cardDetails: cardDetails,
        clientReferenceInformation: clientReferenceInformation,
    }

    // Montar o payload para a chamada de Setup Payer Auth
    const payload = {
        clientReferenceInformation: { code: prePayload.clientReferenceInformation.code },
        merchant: { name: "Loja do Lojista", cnpj: "0561203165498", mcc: "2999" },
        paymentInformation: {
            card: {
                type: cardDetails.type,
                number: cardDetails.cardNumber,
                expirationMonth: prePayload.cardDetails.expiryMonth,
                expirationYear: prePayload.cardDetails.expiryYear,
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
                "ClientId": clientId,
                "ClientKey": clientKey,
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

function base64UrlDecode(input) {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    let decodedData = atob(base64);
    return JSON.parse(decodedData);
}

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
                        code: prePayload.clientReferenceInformation.code
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
                            type: cardDetails.type,
                            expirationMonth: cardDetails.expiryMonth,
                            expirationYear: cardDetails.expiryYear,
                            number: cardDetails.cardNumber,
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
                            "ClientId": clientId,
                            "ClientKey": clientKey,
                        },
                        body: JSON.stringify(enrollmentPayload)
                    });

                    const enrollmentData = await enrollmentResponse.json();
                    consumerAuthenticationInformation = enrollmentData.consumerAuthenticationInformation;
                    console.log("Resposta do Enrollment:", enrollmentData);

                    if (!consumerAuthenticationInformation || !consumerAuthenticationInformation.pareq) {
                        console.error("Dados de autenticação inválidos");
                        return;
                    }

                    try {
                        // Decodificar o paReq
                        const pareqDecoded = base64UrlDecode(consumerAuthenticationInformation.pareq);
                        const challengeWindowSize = pareqDecoded.challengeWindowSize || "01";

                        // Mapear os tamanhos do iframe conforme a especificação
                        const iframeDimensions = {
                            "01": { width: 250, height: 400 },
                            "02": { width: 390, height: 400 },
                            "03": { width: 500, height: 600 },
                            "04": { width: 600, height: 400 },
                            "05": { width: "100%", height: "100%" }
                        };

                        const dimensions = iframeDimensions[challengeWindowSize];

                        // Criar o iframe oculto
                        const iframe = document.createElement("iframe");
                        iframe.name = "step-up-iframe";
                        iframe.width = dimensions.width;
                        iframe.height = dimensions.height;
                        iframe.style.display = "none"; // Ocultar inicialmente

                        // Criar o formulário para submissão automática do desafio
                        const form = document.createElement("form");
                        form.id = "step-up-form";
                        form.target = "step-up-iframe";
                        form.method = "POST";
                        form.action = consumerAuthenticationInformation.stepUpUrl;

                        const input = document.createElement("input");
                        input.type = "hidden";
                        input.name = "JWT";
                        input.value = consumerAuthenticationInformation.accessToken;

                        console.log("stepUpUrl: ", consumerAuthenticationInformation.stepUpUrl)
                        console.log("accessToken: ", consumerAuthenticationInformation.accessToken)

                        form.appendChild(input);
                        document.body.appendChild(iframe);
                        document.body.appendChild(form);

                        // Submeter o formulário automaticamente
                        form.submit();

                        // Tornar o iframe visível após a submissão
                        iframe.style.display = "block";
                    } catch (error) {
                        console.error("Erro ao processar o desafio 3DSecure:", error);
                    }
                } catch (error) {
                    console.error("Erro ao realizar o Enrollment:", error);
                }
            }
        }
    }
});

// Escutar mensagens do iframe do desafio
window.addEventListener("message", function (event) {
    console.log("Mensagem recebida do iframe:", event.data);

    // Validar a origem da mensagem (substitua pela origem correta)
    if (event.origin !== "https://centinelapistag.cardinalcommerce.com") {
        console.warn("Origem não confiável, ignorando mensagem.");
        return;
    }

    try {
        let responseData = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (responseData && responseData.TransactionId) {
            console.log("Transação concluída com sucesso:", responseData.TransactionId);
            callBackendForTransaction(responseData.TransactionId);
        } else {
            console.warn("Resposta do desafio não contém um TransactionId válido.");
        }
    } catch (error) {
        console.error("Erro ao processar a mensagem do iframe:", error);
    }
});

// Função para obter parâmetros da URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        transactionId: params.get("TransactionId"),
        md: params.get("MD")
    };
}

// Capturar e logar os dados na URL de callback
window.onload = function () {
    // Detecta se a página recebeu um POST (quando o iframe redireciona para ela)
    if (performance.navigation.type === 1) { // Verifica se a página foi recarregada
        return; // Evita processar duas vezes
    }

    // Criar um objeto para armazenar os dados recebidos do POST
    let postData = {};

    // Criar um listener para capturar o evento de submit do POST
    document.getElementById("post-form").addEventListener("submit", function (event) {
        event.preventDefault(); // Evita o reload da página

        // Pegar os dados do formulário (exemplo: TransactionId)
        const transactionId = document.getElementById("transactionId").value;
        if (transactionId) {
            console.log("✅ TransactionId recebido:", transactionId);

            // Exibir um alerta ou atualizar a página com os dados recebidos
            alert("Transação concluída com sucesso! TransactionId: " + transactionId);

            // Salvar no localStorage para uso posterior
            localStorage.setItem("transactionId", transactionId);
        } else {
            console.warn("❌ Nenhum TransactionId encontrado no POST.");
        }
    });

    // Criar um script para redirecionar de POST para GET
    if (document.referrer && document.referrer.includes("centinelapistag.cardinalcommerce.com")) {
        // O iframe enviou um POST, então redirecionamos para GET com os dados na URL
        const params = new URLSearchParams(window.location.search);
        postData.transactionId = params.get("TransactionId");

        // Criar uma URL amigável para exibir os dados sem precisar de um backend
        const newUrl = window.location.origin + window.location.pathname + "?TransactionId=" + postData.transactionId;
        history.replaceState({}, "", newUrl);

        // Atualizar a página para refletir os novos dados
        document.getElementById("transactionId").value = postData.transactionId;
        document.getElementById("post-form").submit();
    }
};

window.onload = function () {
    var stepUpForm = document.querySelector('#step-up-form');
    if (stepUpForm) stepUpForm.submit();
}

// Função de exemplo para fazer a chamada final ao backend
function callBackendForTransaction(transactionId) {
    // Aqui você faria a chamada ao seu backend para finalizar o processo
    console.log("Realizando chamada final ao backend com TransactionId:", transactionId);

    // Exemplo de chamada (adicione o seu código de backend aqui):
    fetch('http://localhost:8123/sandbox/antifraud/3ds/complete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transactionId: transactionId })
    })
        .then(response => response.json())
        .then(data => {
            console.log("Resposta final do backend:", data);
        })
        .catch(error => {
            console.error("Erro ao chamar o backend:", error);
        });
}
