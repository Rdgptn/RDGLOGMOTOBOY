(function(){
  var ADMIN_PASSWORD = "rdg2026";
  var WHATSAPP_NUMBER = "5511921398732";
  var STORAGE_KEY = "rdg_rates_v6";
  var INTERNAL_KEY = "rdg_internal_v1";
  var DEFAULT_RATES = {
    moto:  { faixa1AteKm:6, faixa1Valor:30, faixa2AteKm:13, faixa2Valor:40, limiteKmLonga:50, kmAte50:2.90, kmAcima50:2.35, pesoLimite:10, pesoAdicional:2 },
    carro: { faixa1AteKm:6, faixa1Valor:40, faixa2AteKm:20, faixa2Valor:65, limiteKmLonga:50, kmAte50:3.00, kmAcima50:2.50 },
    urgente:12, agendada:10, parada:7,
    repasse: { moto:[1.50,1.60,1.70,1.80,2.00,2.20], carro:[1.80,2.00,2.20,2.40,2.70,3.00] },
    margemMinima:20, whatsappAlertas:true, whatsappAdmin:"5511921398732",
    pagamento: { cartaoAvista:4, faturado10:20, faturado14:3, faturadoMulta:40, parceladoPct:2.4, parceladoObs:"" }
  };

  var MAPBOX_TOKEN = "pk.eyJ1Ijoicm9vZHJpZ29tYXJxdWVzIiwiYSI6ImNtdDN2aWFmNzBhcW8yd29kNjVuaWI2OXAifQ.ZpyJwxiXMqE0PaNPzJtBNA";

  function getRates(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return JSON.parse(JSON.stringify(DEFAULT_RATES));
      var parsed = JSON.parse(raw);
      return {
        moto: Object.assign({}, DEFAULT_RATES.moto, parsed.moto),
        carro: Object.assign({}, DEFAULT_RATES.carro, parsed.carro),
        urgente: (typeof parsed.urgente === 'number') ? parsed.urgente : DEFAULT_RATES.urgente,
        agendada: (typeof parsed.agendada === 'number') ? parsed.agendada : DEFAULT_RATES.agendada,
        parada: (typeof parsed.parada === 'number' && parsed.parada !== 10) ? parsed.parada : DEFAULT_RATES.parada,
        pagamento: Object.assign({}, DEFAULT_RATES.pagamento, parsed.pagamento),
        repasse: Object.assign({}, DEFAULT_RATES.repasse, parsed.repasse),
        margemMinima: typeof parsed.margemMinima === "number" ? parsed.margemMinima : DEFAULT_RATES.margemMinima,
        whatsappAlertas: typeof parsed.whatsappAlertas === "boolean" ? parsed.whatsappAlertas : DEFAULT_RATES.whatsappAlertas,
        whatsappAdmin: parsed.whatsappAdmin || DEFAULT_RATES.whatsappAdmin
      };
    }catch(e){ return JSON.parse(JSON.stringify(DEFAULT_RATES)); }
  }
  function setRates(r){ localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }
  function fmt(n){ return "R$ " + n.toFixed(2).replace(".", ","); }

  function calcHaversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c) * 1.3;
  }

  var urgenteCb = document.getElementById('urgente');
  var agendadaCb = document.getElementById('agendada');
  var toggleUrgente = document.getElementById('toggle-urgente');
  var toggleAgendada = document.getElementById('toggle-agendada');
  var btnCalcular = document.getElementById('btn-calcular');
  var resultEl = document.getElementById('result');
  var resultRows = document.getElementById('result-rows');
  var resultTotal = document.getElementById('result-total');
  var waPedido = document.getElementById('wa-pedido');
  var statusEl = document.getElementById('calc-status');
  var stopsContainer = document.getElementById('stops-container');
  var btnAddStop = document.getElementById('btn-add-stop');
  var pesoRow = document.getElementById('peso-row');
  var pesoInput = document.getElementById('peso');
  var pesoNoteCarro = document.getElementById('peso-note-carro');
  var paymentInputs = document.querySelectorAll('input[name=pagamento]');
  var paymentExtraNote = document.getElementById('payment-extra-note');

  function getPaymentMethod(){
    var selected = document.querySelector('input[name=pagamento]:checked');
    return selected ? selected.value : 'Pix';
  }

  function getPaymentNoteText(method){
    var p = getRates().pagamento;
    if(method === 'Cartão à vista'){
      return 'Acréscimo de ' + fmt(p.cartaoAvista) + ' já incluso no total (pagamento à vista no cartão).';
    }
    if(method === 'Cartão parcelado'){
      var pctTxt = String(p.parceladoPct).replace('.', ',') + '%';
      var base = 'Acréscimo de ' + pctTxt + ' sobre o valor do serviço (parcelamento no cartão).';
      return p.parceladoObs ? base + ' ' + p.parceladoObs : base;
    }
    if(method === 'Faturado — cliente fixo'){
      return 'Acréscimo de ' + fmt(p.faturado10) + ' nos primeiros 10 dias. Após esse prazo, mais ' + fmt(p.faturado14) + ' durante os 14 dias seguintes. Ao completar 30 dias sem pagamento: multa de ' + fmt(p.faturadoMulta) + '.';
    }
    return '';
  }

  function updatePaymentNote(){
    var text = getPaymentNoteText(getPaymentMethod());
    if(text){
      paymentExtraNote.textContent = text;
      paymentExtraNote.classList.add('show');
    }else{
      paymentExtraNote.textContent = '';
      paymentExtraNote.classList.remove('show');
    }
  }

  var currentMode = 'moto';
  var modeTabs = document.querySelectorAll('#mode-tabs .mode-tab');
  Array.prototype.forEach.call(modeTabs, function(tab){
    tab.addEventListener('click', function(){
      currentMode = tab.getAttribute('data-mode');
      Array.prototype.forEach.call(modeTabs, function(t){ t.classList.toggle('active', t === tab); });
      var isMoto = currentMode === 'moto';
      pesoRow.style.display = isMoto ? 'flex' : 'none';
      pesoNoteCarro.classList.toggle('show', !isMoto);
      if(!isMoto) pesoInput.value = '';
      resultEl.classList.remove('show');
      clearStatus();
      checkAddressStep();
    });
  });

  urgenteCb.addEventListener('change', function(){ toggleUrgente.classList.toggle('active', urgenteCb.checked); });
  agendadaCb.addEventListener('change', function(){ toggleAgendada.classList.toggle('active', agendadaCb.checked); });
  Array.prototype.forEach.call(paymentInputs, function(input){
    input.addEventListener('change', function(){
      Array.prototype.forEach.call(paymentInputs, function(item){ item.closest('.payment-option').classList.toggle('selected', item.checked); });
      updatePaymentNote();
    });
  });
  updatePaymentNote();

  function showStatus(msg, isError){
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', !!isError);
    statusEl.classList.add('show');
  }
  function clearStatus(){ statusEl.classList.remove('show'); }

  var locations = {};
  var stopCounter = 0;

  // STEPPER: indicador de progresso do orçamento
  var stepEls = document.querySelectorAll('#calc-stepper .calc-step');
  function setStep(n){
    Array.prototype.forEach.call(stepEls, function(el){
      var s = parseInt(el.getAttribute('data-step'), 10);
      el.classList.toggle('done', s < n);
      el.classList.toggle('active', s === n);
    });
  }
  function checkAddressStep(){
    var o = document.getElementById('origem').value.trim();
    var d = document.getElementById('destino').value.trim();
    if(o && d){ setStep(2); } else { setStep(1); }
  }

  function debounce(fn, delay){
    var t;
    return function(){
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function(){ fn.apply(ctx, args); }, delay);
    };
  }

  function setupAutocomplete(inputEl, suggestionsEl, wrapEl, key){
    var doSearch = debounce(function(query){
      if(!query || query.length < 3){
        suggestionsEl.classList.remove('show');
        return;
      }
      var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query) + '.json'
        + '?access_token=' + MAPBOX_TOKEN
        + '&country=BR'
        + '&language=pt'
        + '&limit=5'
        + '&autocomplete=true'
        + '&proximity=-46.6333,-23.5505'
        + '&bbox=-53.11,-25.31,-44.16,-19.78'
        + '&types=address,postcode,place,neighborhood,locality,poi';
      fetch(url).then(function(r){ return r.json(); }).then(function(data){
        var feats = data.features || [];
        if(feats.length === 0){
          suggestionsEl.innerHTML = '<div class="addr-empty">Nenhum endereço encontrado.</div>';
          suggestionsEl.classList.add('show');
          return;
        }
        suggestionsEl.innerHTML = feats.map(function(f, i){
          return '<button type="button" class="addr-suggestion" data-idx="' + i + '">' + f.place_name + '</button>';
        }).join('');
        suggestionsEl.classList.add('show');
        Array.prototype.forEach.call(suggestionsEl.querySelectorAll('.addr-suggestion'), function(btn){
          btn.addEventListener('click', function(){
            var f = feats[parseInt(btn.getAttribute('data-idx'), 10)];
            inputEl.value = f.place_name;
            locations[key] = { lng: f.center[0], lat: f.center[1], text: f.place_name };
            wrapEl.classList.add('has-coords');
            suggestionsEl.classList.remove('show');
          });
        });
      }).catch(function(){
        suggestionsEl.innerHTML = '<div class="addr-empty">Digite o endereço completo com número e cidade.</div>';
        suggestionsEl.classList.add('show');
      });
    }, 300);

    inputEl.addEventListener('input', function(){
      delete locations[key];
      wrapEl.classList.remove('has-coords');
      doSearch(inputEl.value.trim());
    });
    document.addEventListener('click', function(e){
      if(!wrapEl.contains(e.target)) suggestionsEl.classList.remove('show');
    });
  }

  setupAutocomplete(document.getElementById('origem'), document.getElementById('origem-suggestions'), document.getElementById('origem-wrap'), 'origem');
  setupAutocomplete(document.getElementById('destino'), document.getElementById('destino-suggestions'), document.getElementById('destino-wrap'), 'destino');
  document.getElementById('origem').addEventListener('input', checkAddressStep);
  document.getElementById('destino').addEventListener('input', checkAddressStep);

  function addStopRow(){
    stopCounter++;
    var key = 'stop-' + stopCounter;
    var row = document.createElement('div');
    row.className = 'stop-row';
    row.setAttribute('data-key', key);
    row.innerHTML =
      '<div class="addr-field">' +
        '<label>Parada adicional</label>' +
        '<div class="addr-input-wrap" id="' + key + '-wrap">' +
          '<input type="text" placeholder="Rua, número e cidade" autocomplete="off">' +
          '<div class="addr-suggestions"></div>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="btn-remove-stop" aria-label="Remover parada">×</button>';
    stopsContainer.appendChild(row);

    setupAutocomplete(row.querySelector('input[type=text]'), row.querySelector('.addr-suggestions'), row.querySelector('.addr-input-wrap'), key);

    row.querySelector('.btn-remove-stop').addEventListener('click', function(){
      delete locations[key];
      row.remove();
    });
  }
  btnAddStop.addEventListener('click', addStopRow);

  function getStopKeys(){
    return Array.prototype.map.call(stopsContainer.querySelectorAll('.stop-row'), function(row){
      return row.getAttribute('data-key');
    });
  }

  function processCalculation(km, stopKeys){
    var allRates = getRates();
    var rates = allRates[currentMode];
    var base;
    if(currentMode === 'moto'){
      if(km <= rates.faixa1AteKm){
        base = rates.faixa1Valor;
      }else if(km <= rates.faixa2AteKm){
        base = rates.faixa2Valor;
      }else if(km <= rates.limiteKmLonga){
        base = km * rates.kmAte50;
      }else{
        base = km * rates.kmAcima50;
      }
    }else{
      if(km <= rates.faixa1AteKm){
        base = rates.faixa1Valor;
      }else if(km <= rates.faixa2AteKm){
        base = rates.faixa2Valor;
      }else if(km <= rates.limiteKmLonga){
        base = km * rates.kmAte50;
      }else{
        base = km * rates.kmAcima50;
      }
    }
    var subtotal = base;

    var peso = parseFloat(pesoInput.value) || 0;
    var addPeso = 0;
    if(currentMode === 'moto' && peso > rates.pesoLimite){
      addPeso = Math.ceil(peso - rates.pesoLimite) * rates.pesoAdicional;
    }

    var addParadas = stopKeys.length * allRates.parada;
    var addUrgente = urgenteCb.checked ? allRates.urgente : 0;
    var addAgendada = agendadaCb.checked ? allRates.agendada : 0;
    var payMethod = getPaymentMethod();
    var addCartao = (payMethod === 'Cartão à vista') ? allRates.pagamento.cartaoAvista : 0;
    var baseTotal = subtotal + addPeso + addParadas + addUrgente + addAgendada;
    var addParcelado = (payMethod === 'Cartão parcelado') ? (baseTotal * allRates.pagamento.parceladoPct / 100) : 0;
    var total = baseTotal + addCartao + addParcelado;

    var veiculoLabel = currentMode === 'moto' ? 'Moto' : 'Carro';
    var rows = [];
    rows.push('<div class="result-row"><span>Corrida ' + veiculoLabel + ' (' + km.toFixed(1).replace('.',',') + ' km)</span><span>' + fmt(subtotal) + '</span></div>');
    if(addPeso > 0) rows.push('<div class="result-row"><span>Peso excedente (' + (peso - rates.pesoLimite).toFixed(0) + ' kg acima de ' + rates.pesoLimite + ' kg)</span><span>' + fmt(addPeso) + '</span></div>');
    if(addParadas > 0) rows.push('<div class="result-row"><span>Paradas adicionais (' + stopKeys.length + ')</span><span>' + fmt(addParadas) + '</span></div>');
    if(addUrgente > 0) rows.push('<div class="result-row"><span>Entrega urgente</span><span>' + fmt(addUrgente) + '</span></div>');
    if(addAgendada > 0) rows.push('<div class="result-row"><span>Coleta agendada</span><span>' + fmt(addAgendada) + '</span></div>');
    if(addCartao > 0) rows.push('<div class="result-row"><span>Acréscimo cartão à vista</span><span>' + fmt(addCartao) + '</span></div>');
    if(addParcelado > 0) rows.push('<div class="result-row"><span>Acréscimo parcelamento (' + String(allRates.pagamento.parceladoPct).replace('.', ',') + '%)</span><span>' + fmt(addParcelado) + '</span></div>');
    
    resultRows.innerHTML = rows.join('');
    resultTotal.textContent = fmt(total);
    resultEl.classList.add('show');

    var stopLines = stopKeys.map(function(k, i){ return 'Parada ' + (i+1) + ': ' + (locations[k] ? locations[k].text : 'Intermediária') + '\n'; }).join('');
    var origText = locations.origem ? locations.origem.text : document.getElementById('origem').value;
    var destText = locations.destino ? locations.destino.text : document.getElementById('destino').value;

    var payNote = getPaymentNoteText(payMethod);
    var msg = "*RDGLOGEXPRESS — SOLICITAÇÃO DE FRETE*\n\n" +
      "Olá! Gostaria de confirmar uma corrida calculada pelo site.\n\n" +
      "*DADOS DO SERVIÇO*\n" +
      "Veículo: " + veiculoLabel + "\n" +
      "Pagamento: " + payMethod + "\n" +
      "Urgência: " + (urgenteCb.checked ? "Sim" : "Não") + "\n" +
      "Agendamento: " + (agendadaCb.checked ? "Sim" : "Não") + "\n\n" +
      "*ROTA*\n" +
      "Coleta: " + origText + "\n" +
      stopLines +
      "Entrega: " + destText + "\n" +
      "Distância aproximada: " + km.toFixed(1).replace('.',',') + " km\n" +
      (currentMode === "moto" && peso > 0 ? "Peso: " + peso + " kg\n" : "") +
      "\n*VALORES*\n" +
      "Total estimado: " + fmt(total) + "\n" +
      (payNote ? "\n*CONDIÇÃO DE PAGAMENTO*\n" + payNote + "\n" : "") +
      "\nA Ordem de Serviço em PDF será anexada para conferência.";
    waPedido.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);

    window.rdgQuote = {
      number: 'ORC-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6),
      date: new Date().toLocaleDateString('pt-BR'),
      vehicle: veiculoLabel,
      payment: payMethod,
      paymentNote: payNote,
      origin: origText,
      destination: destText,
      stops: stopKeys.map(function(k, i){ return (i + 1) + '. ' + (locations[k] ? locations[k].text : 'Intermediária'); }),
      distance: km.toFixed(1).replace('.', ',') + ' km',
      weight: currentMode === 'moto' ? (peso > 0 ? peso + ' kg' : 'Não informado') : 'Não aplicável para carro',
      urgent: urgenteCb.checked ? 'Sim' : 'Não',
      scheduled: agendadaCb.checked ? 'Sim' : 'Não',
      total: fmt(total)
    };
  }

  btnCalcular.addEventListener('click', function(){
    clearStatus();

    var origVal = document.getElementById('origem').value.trim();
    var destVal = document.getElementById('destino').value.trim();

    if(!origVal){
      showStatus('Por favor, preencha o endereço de coleta.', true);
      return;
    }
    if(!destVal){
      showStatus('Por favor, preencha o endereço de entrega.', true);
      return;
    }
    setStep(3);

    var stopKeys = getStopKeys();

    btnCalcular.disabled = true;
    btnCalcular.innerHTML = 'Calculando rota... <span aria-hidden="true">◌</span>';

    if(locations.origem && locations.destino){
      var coordsOrder = ['origem'].concat(stopKeys).concat(['destino']);
      var coordsStr = coordsOrder.map(function(k){ return locations[k].lng + ',' + locations[k].lat; }).join(';');
      var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + coordsStr
        + '?access_token=' + MAPBOX_TOKEN + '&overview=false&geometries=geojson';

      fetch(url).then(function(r){ return r.json(); }).then(function(data){
        btnCalcular.disabled = false;
        btnCalcular.innerHTML = 'Calcular valor da corrida <span aria-hidden="true">→</span>';

        if(data.routes && data.routes.length > 0){
          var km = data.routes[0].distance / 1000;
          processCalculation(km, stopKeys);
        } else {
          var kmHaversine = calcHaversineKm(locations.origem.lat, locations.origem.lng, locations.destino.lat, locations.destino.lng);
          processCalculation(kmHaversine, stopKeys);
        }
      }).catch(function(){
        btnCalcular.disabled = false;
        btnCalcular.innerHTML = 'Calcular valor da corrida <span aria-hidden="true">→</span>';
        var kmHaversine = calcHaversineKm(locations.origem.lat, locations.origem.lng, locations.destino.lat, locations.destino.lng);
        processCalculation(kmHaversine, stopKeys);
      });
    } else {
      setTimeout(function(){
        btnCalcular.disabled = false;
        btnCalcular.innerHTML = 'Calcular valor da corrida <span aria-hidden="true">→</span>';
        processCalculation(12, stopKeys);
      }, 500);
    }
  });


  function escapeQuote(value){
    return String(value || '').replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; });
  }
  var osGerada = false;

  function openQuotePrint(){
    var q = window.rdgQuote;
    if(!q){ return; }
    var stops = q.stops.length ? q.stops.map(function(s){ return '<li>' + escapeQuote(s) + '</li>'; }).join('') : '<li>Nenhuma</li>';
    var printWindow = window.open('', '_blank', 'width=900,height=1000');
    if(!printWindow){ alert('Permita pop-ups para gerar o formulário em PDF.'); return; }
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento ${escapeQuote(q.number)} — RDGLOGEXPRESS</title><style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#f5f8fb;color:#17324d;font:14px Arial,sans-serif}main{max-width:800px;margin:auto;background:#fff;padding:34px;border:1px solid #d7e2e9;border-radius:14px}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:4px solid #d8870b;padding-bottom:16px}.brand{font-size:24px;font-weight:800}.brand b{color:#d8870b}.tag{font-size:11px;color:#d8870b;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-align:right}.muted{color:#5e7386;font-size:12px}.section{margin-top:18px;border:1px solid #d7e2e9;border-radius:10px;padding:15px}.section h2{margin:0 0 12px;color:#d8870b;font-size:12px;text-transform:uppercase;letter-spacing:1px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field strong{display:block;font-size:11px;color:#5e7386;text-transform:uppercase;margin-bottom:4px}.route{display:grid;grid-template-columns:1fr 1fr;gap:16px}.route strong{display:block;color:#5e7386;font-size:11px;text-transform:uppercase;margin-bottom:5px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.money{background:#fff3d6;border-color:#d8870b}.total{font-size:24px;color:#b86b00;font-weight:800}.footer{margin-top:22px;padding-top:12px;border-top:1px solid #d7e2e9;text-align:center;color:#168b62;font-weight:700;font-size:12px}ul{margin:6px 0 0;padding-left:18px}@media print{body{background:#fff}main{border:0;padding:0}}
    </style></head><body><main><div class="head"><div><div class="brand"><b>RDGLOG</b>EXPRESS</div><div class="muted">LOGÍSTICA E ENTREGAS RÁPIDAS</div></div><div><div class="tag">ORDEM DE SERVIÇO</div><div class="muted">${escapeQuote(q.number)}<br>Emissão: ${escapeQuote(q.date)}</div></div></div><div class="section"><h2>Dados do serviço</h2><div class="grid"><div class="field"><strong>Veículo</strong>${escapeQuote(q.vehicle)}</div><div class="field"><strong>Pagamento</strong>${escapeQuote(q.payment)}</div><div class="field"><strong>Urgente</strong>${escapeQuote(q.urgent)}</div><div class="field"><strong>Agendamento</strong>${escapeQuote(q.scheduled)}</div></div></div><div class="section"><h2>Resumo da rota</h2><div class="route"><div><strong>Coleta</strong>${escapeQuote(q.origin)}</div><div><strong>Entrega</strong>${escapeQuote(q.destination)}</div></div><div class="summary"><div><strong>Distância</strong><br>${escapeQuote(q.distance)}</div><div><strong>Peso</strong><br>${escapeQuote(q.weight)}</div><div><strong>Paradas</strong><br><ul>${stops}</ul></div></div></div><div class="section money"><h2>Valor da ordem de serviço</h2><div class="total">${escapeQuote(q.total)}</div><div class="muted">O valor final será confirmado pela RDGLOGEXPRESS antes da coleta.</div></div><div class="section"><h2>Condições comerciais</h2><div class="muted">Esta Ordem de Serviço registra a solicitação e o valor calculado para a corrida. É válida para Pix, cartão, dinheiro e faturamento. O faturamento é exclusivo para clientes fixos, mediante cadastro e aprovação comercial prévia. O valor final pode ser confirmado antes da coleta. Mercadorias devem estar embaladas e identificadas pelo contratante.${q.paymentNote ? '<br><br><strong>Condição de pagamento selecionada:</strong> ' + escapeQuote(q.paymentNote) : ''}</div></div><div class="footer">RDGLOGEXPRESS · (11) 92139-8732 · marques.dev01@outlook.com</div></main><script>window.onload=function(){window.print()}<\/script></body></html>`);
    printWindow.document.close();
    osGerada = true;
  }
  document.getElementById('btn-pdf-orcamento').addEventListener('click', openQuotePrint);
  waPedido.addEventListener('click', function(event){
    if(!osGerada){
      event.preventDefault();
      alert('Gere primeiro a Ordem de Serviço em PDF. Ela é obrigatória para registrar e confirmar o pedido.');
    }
  });

  // ADMIN MODAL LOGIC
  var overlay = document.getElementById('admin-overlay');
  var loginView = document.getElementById('admin-login-view');
  var ratesView = document.getElementById('admin-rates-view');
  var passInput = document.getElementById('admin-pass');
  var errorMsg = document.getElementById('admin-error');
  var savedMsg = document.getElementById('admin-saved-msg');

  function openModal(){
    overlay.classList.add('show');
    loginView.style.display = 'block';
    ratesView.style.display = 'none';
    errorMsg.classList.remove('show');
    passInput.value = '';
    setTimeout(function(){ passInput.focus(); }, 50);
  }
  function closeModal(){ overlay.classList.remove('show'); }

  function fillRatesForm(){
    var r = getRates();
    document.getElementById('r-moto-faixa1-ate').value = r.moto.faixa1AteKm;
    document.getElementById('r-moto-faixa1-valor').value = r.moto.faixa1Valor;
    document.getElementById('r-moto-faixa2-ate').value = r.moto.faixa2AteKm;
    document.getElementById('r-moto-faixa2-valor').value = r.moto.faixa2Valor;
    document.getElementById('r-moto-km-ate50').value = r.moto.kmAte50;
    document.getElementById('r-moto-limite-longa').value = r.moto.limiteKmLonga;
    document.getElementById('r-moto-km-acima50').value = r.moto.kmAcima50;
    document.getElementById('r-peso-limite').value = r.moto.pesoLimite;
    document.getElementById('r-peso-adicional').value = r.moto.pesoAdicional;

    document.getElementById('r-carro-faixa1-ate').value = r.carro.faixa1AteKm;
    document.getElementById('r-carro-faixa1-valor').value = r.carro.faixa1Valor;
    document.getElementById('r-carro-faixa2-ate').value = r.carro.faixa2AteKm;
    document.getElementById('r-carro-faixa2-valor').value = r.carro.faixa2Valor;
    document.getElementById('r-carro-km-ate50').value = r.carro.kmAte50;
    document.getElementById('r-carro-limite-longa').value = r.carro.limiteKmLonga;
    document.getElementById('r-carro-km-acima50').value = r.carro.kmAcima50;

    document.getElementById('r-urgente').value = r.urgente;
    document.getElementById('r-agendada').value = r.agendada;
    document.getElementById('r-parada').value = r.parada;

    document.getElementById('r-cartao-avista').value = r.pagamento.cartaoAvista;
    document.getElementById('r-faturado-10').value = r.pagamento.faturado10;
    document.getElementById('r-faturado-14').value = r.pagamento.faturado14;
    document.getElementById('r-faturado-multa').value = r.pagamento.faturadoMulta;
    document.getElementById('r-parcelado-pct').value = r.pagamento.parceladoPct;
    document.getElementById('r-parcelado-obs').value = r.pagamento.parceladoObs;
    [0,1,2,3,4,5].forEach(function(i){ document.getElementById('rep-moto-'+i).value = r.repasse.moto[i]; document.getElementById('rep-carro-'+i).value = r.repasse.carro[i]; });
    document.getElementById('margem-minima').value = r.margemMinima;
  }

  var adminModeTabs = document.querySelectorAll('#admin-mode-tabs .mode-tab');
  var adminRatesMoto = document.getElementById('admin-rates-moto');
  var adminRatesCarro = document.getElementById('admin-rates-carro');
  Array.prototype.forEach.call(adminModeTabs, function(tab){
    tab.addEventListener('click', function(){
      var m = tab.getAttribute('data-admin-mode');
      Array.prototype.forEach.call(adminModeTabs, function(t){ t.classList.toggle('active', t === tab); });
      adminRatesMoto.style.display = m === 'moto' ? 'block' : 'none';
      adminRatesCarro.style.display = m === 'carro' ? 'block' : 'none';
    });
  });

  // Acesso ao painel: atalho de teclado, sem ícone visível na página.
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')){
      e.preventDefault();
      openModal();
    }
  });
  document.getElementById('admin-mobile-access').addEventListener('click', openModal);
  document.getElementById('admin-close-1').addEventListener('click', closeModal);
  document.getElementById('admin-close-2').addEventListener('click', closeModal);
  document.getElementById('admin-cancel-1').addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });

  document.getElementById('admin-login-btn').addEventListener('click', function(){
    if(passInput.value === ADMIN_PASSWORD){ loginView.style.display='none'; ratesView.style.display='block'; fillRatesForm(); }
    else { errorMsg.textContent='Senha incorreta.'; errorMsg.classList.add('show'); }
  });

  document.getElementById('admin-save-btn').addEventListener('click', function(){
    var r = {
      moto: {
        faixa1AteKm: parseFloat(document.getElementById('r-moto-faixa1-ate').value) || DEFAULT_RATES.moto.faixa1AteKm,
        faixa1Valor: parseFloat(document.getElementById('r-moto-faixa1-valor').value) || 0,
        faixa2AteKm: parseFloat(document.getElementById('r-moto-faixa2-ate').value) || DEFAULT_RATES.moto.faixa2AteKm,
        faixa2Valor: parseFloat(document.getElementById('r-moto-faixa2-valor').value) || 0,
        kmAte50: parseFloat(document.getElementById('r-moto-km-ate50').value) || 0,
        limiteKmLonga: parseFloat(document.getElementById('r-moto-limite-longa').value) || DEFAULT_RATES.moto.limiteKmLonga,
        kmAcima50: parseFloat(document.getElementById('r-moto-km-acima50').value) || 0,
        pesoLimite: parseFloat(document.getElementById('r-peso-limite').value) || 0,
        pesoAdicional: parseFloat(document.getElementById('r-peso-adicional').value) || 0
      },
      carro: {
        faixa1AteKm: parseFloat(document.getElementById('r-carro-faixa1-ate').value) || DEFAULT_RATES.carro.faixa1AteKm,
        faixa1Valor: parseFloat(document.getElementById('r-carro-faixa1-valor').value) || 0,
        faixa2AteKm: parseFloat(document.getElementById('r-carro-faixa2-ate').value) || DEFAULT_RATES.carro.faixa2AteKm,
        faixa2Valor: parseFloat(document.getElementById('r-carro-faixa2-valor').value) || 0,
        limiteKmLonga: parseFloat(document.getElementById('r-carro-limite-longa').value) || DEFAULT_RATES.carro.limiteKmLonga,
        kmAte50: parseFloat(document.getElementById('r-carro-km-ate50').value) || 0,
        kmAcima50: parseFloat(document.getElementById('r-carro-km-acima50').value) || 0
      },
      urgente: parseFloat(document.getElementById('r-urgente').value) || 0,
      agendada: parseFloat(document.getElementById('r-agendada').value) || 0,
      parada: parseFloat(document.getElementById('r-parada').value) || 0,
      pagamento: {
        cartaoAvista: parseFloat(document.getElementById('r-cartao-avista').value) || 0,
        faturado10: parseFloat(document.getElementById('r-faturado-10').value) || 0,
        faturado14: parseFloat(document.getElementById('r-faturado-14').value) || 0,
        faturadoMulta: parseFloat(document.getElementById('r-faturado-multa').value) || 0,
        parceladoPct: parseFloat(document.getElementById('r-parcelado-pct').value) || 0,
        parceladoObs: document.getElementById('r-parcelado-obs').value.trim()
      }
    };
    setRates(r);
    updatePaymentNote();
    savedMsg.textContent='Configurações salvas neste navegador! ✓';
    savedMsg.classList.add('show');
    setTimeout(function(){savedMsg.classList.remove('show');},2500);
    setTimeout(function(){ savedMsg.classList.remove('show'); }, 2000);
  });

  document.getElementById('admin-restore-btn').addEventListener('click', function(){
    setRates(DEFAULT_RATES);
    fillRatesForm();
    updatePaymentNote();
    savedMsg.classList.add('show');
    setTimeout(function(){ savedMsg.classList.remove('show'); }, 2000);
  });

  document.getElementById('simular-btn').addEventListener('click', function(){
    var r=getRates(), tipo=document.getElementById('sim-veiculo').value, km=parseFloat(document.getElementById('sim-km').value)||0, cliente=parseFloat(document.getElementById('sim-cliente').value)||0;
    var repKm=parseFloat(document.getElementById('sim-repasse-km').value)||0, paradas=parseInt(document.getElementById('sim-paradas').value,10)||0;
    var prestador=km*repKm + paradas*r.parada + (document.getElementById('sim-urgente').checked?r.urgente:0) + (document.getElementById('sim-agendada').checked?r.agendada:0);
    if(tipo==='moto'){ var peso=parseFloat(document.getElementById('sim-peso').value)||0; if(peso>r.moto.pesoLimite) prestador += Math.ceil(peso-r.moto.pesoLimite)*r.moto.pesoAdicional; }
    var margem=cliente-prestador, pct=cliente ? margem/cliente*100 : 0, cls=margem<0?'bad':pct<r.margemMinima?'warn':'ok';
    var situacao=margem<0?'🚨 PREJUÍZO: o repasse é maior que o valor cobrado.':pct<r.margemMinima?'⚠️ ATENÇÃO: margem abaixo do limite configurado.':'✅ MARGEM DENTRO DO LIMITE';
    document.getElementById('sim-result').style.display='block'; document.getElementById('sim-result').className='sim-result admin-alert '+cls;
    document.getElementById('sim-result').innerHTML='<strong>VALOR DO CLIENTE:</strong> '+fmt(cliente)+'<br><strong>VALOR DO PRESTADOR:</strong> '+fmt(prestador)+'<br><strong>MARGEM DA RDG:</strong> '+fmt(margem)+'<br><strong>MARGEM:</strong> '+pct.toFixed(2).replace('.',',')+'%<br><strong>COBRADO/KM:</strong> '+fmt(km?cliente/km:0)+'/km<br><strong>REPASSADO/KM:</strong> '+fmt(repKm)+'/km<br><strong>DIFERENÇA/KM:</strong> '+fmt(km?(cliente-prestador)/km:0)+'/km<br><br>'+situacao;
    if(margem<0 || pct<r.margemMinima){ document.getElementById('sim-result').innerHTML += '<br><span class="internal-note">Alerta administrativo exibido apenas nesta demonstração. Envio automático por WhatsApp removido da versão GitHub Pages.</span>'; }
  });

  document.getElementById('admin-logout-btn').addEventListener('click', closeModal);

})();
