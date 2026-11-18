(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const money = (amount) => `$${amount.toFixed(2)}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const varieties = [
    { id: 'classic', name: 'Classic chocolate chip', icon: '🍪', cost: 0.40, price: 1.75, demand: 0, description: 'Neighborhood favorite · $0.40 ingredients · suggested price $1.75' },
    { id: 'double-chocolate', name: 'Double chocolate', icon: '🍫', cost: 0.58, price: 2.50, demand: -1, description: 'Rich cocoa and extra chips · $0.58 ingredients · suggested price $2.50' },
    { id: 'oatmeal', name: 'Oatmeal raisin', icon: '🥣', cost: 0.46, price: 2.00, demand: -2, description: 'Hearty homestyle treat · $0.46 ingredients · suggested price $2.00' },
    { id: 'sugar', name: 'Birthday sugar cookie', icon: '🍥', cost: 0.67, price: 3.00, demand: 2, description: 'Colorful bakery special · $0.67 ingredients · suggested price $3.00' },
  ];

  const weather = [
    { name: 'A gentle morning', foot: 'The usual neighborhood crowd', icon: '🌤️', tag: 'Steady', boost: 0, note: 'A familiar day on the block. A thoughtful price and fresh batch should do nicely.' },
    { name: 'Sunny sidewalk', foot: 'A few more strollers today', icon: '☀️', tag: 'Busy', boost: 7, note: 'The sunshine brings folks out. There may be a few extra cookie lovers passing by.' },
    { name: 'Rainy afternoon', foot: 'A quieter day outside', icon: '🌧️', tag: 'Slow', boost: -8, note: 'The rain keeps some people home. A little advertising could help brighten the day.' },
    { name: 'Market day!', foot: 'The whole block is buzzing', icon: '🎪', tag: 'Very busy', boost: 15, note: 'The neighborhood market is in town! Expect a lively crowd and plenty of curious noses.' },
    { name: 'A cozy breeze', foot: 'Neighbors fancy a treat', icon: '🍃', tag: 'Good', boost: 4, note: 'A lovely day for a stroll and something warm from the oven.' },
    { name: 'School lets out', foot: 'Young cookie fans nearby', icon: '🎒', tag: 'Busy', boost: 10, note: 'The school crowd is on the move. Keep a few extra treats ready for the afternoon rush.' },
    { name: 'A quiet Tuesday', foot: 'A slower neighborhood pace', icon: '☁️', tag: 'Slow', boost: -4, note: 'A calm day on the block. Reliable favorites and fair prices can win the day.' },
  ];

  const game = {
    day: 1,
    cash: 100,
    history: [],
    closed: false,
    animating: false,
    weather: null,
    runId: 0,
    plan: { bake: 30, variety: 'classic', price: 1.75, ad: 5 },
  };

  function selectedVariety() {
    return varieties.find((variety) => variety.id === game.plan.variety) || varieties[0];
  }

  function setVariety(id, resetPrice = true) {
    game.plan.variety = varieties.some((variety) => variety.id === id) ? id : varieties[0].id;
    const variety = selectedVariety();
    $('varietySelect').value = variety.id;
    $('varietyDescription').textContent = variety.description;
    $('bakeHint').textContent = `$${variety.cost.toFixed(2)} ingredient cost each`;
    if (resetPrice) {
      game.plan.price = variety.price;
      $('priceInput').value = variety.price.toFixed(2);
      $('priceRange').value = clamp(variety.price, Number($('priceRange').min), Number($('priceRange').max));
      $('priceOut').textContent = formatValue('price', variety.price);
    }
  }

  const fields = [
    ['bake', 'bakeInput', 'bakeRange', 0, 500, 1],
    ['price', 'priceInput', 'priceRange', 0.25, 10, 0.25],
    ['ad', 'adInput', 'adRange', 0, 100, 1],
  ];

  function formatValue(key, value) {
    if (key === 'price') return `$${Number(value).toFixed(2)}`;
    if (key === 'ad') return `$${Math.round(value)}`;
    return String(Math.round(value));
  }

  function syncField(key, sourceId) {
    const [, inputId, rangeId, min, max, step] = fields.find(([name]) => name === key);
    let value = Number($(sourceId).value);
    if (!Number.isFinite(value)) value = min;
    value = clamp(Math.round(value / step) * step, min, max);
    game.plan[key] = value;
    $(inputId).value = key === 'price' ? value.toFixed(2) : value;
    $(rangeId).value = clamp(value, Number($(rangeId).min), Number($(rangeId).max));
    $(`${key}Out`).textContent = formatValue(key, value);
    updateEstimate();
  }

  function updateEstimate() {
    const spend = game.plan.bake * selectedVariety().cost + game.plan.ad;
    $('spendEstimate').textContent = money(spend);
    $('openShop').disabled = game.animating || (!game.closed && spend > game.cash + 1e-8) || (game.day >= 30 && game.closed);
    $('openShop').textContent = game.animating
      ? 'Serving customers…'
      : game.closed
        ? 'Plan tomorrow  →'
        : spend > game.cash + 1e-8
          ? 'Not enough cash to open'
          : 'Open the shop  →';
  }

  fields.forEach(([key, inputId, rangeId]) => {
    $(inputId).addEventListener('input', () => syncField(key, inputId));
    $(rangeId).addEventListener('input', () => syncField(key, rangeId));
  });
  varieties.forEach((variety) => {
    const option = document.createElement('option');
    option.value = variety.id;
    option.textContent = `${variety.icon}  ${variety.name} · $${variety.price.toFixed(2)}`;
    $('varietySelect').append(option);
  });
  $('varietySelect').addEventListener('change', () => { setVariety($('varietySelect').value); updateEstimate(); });
  setVariety(game.plan.variety, false);

  function setWeather() {
    game.weather = weather[(game.day * 7 + Math.floor(game.day / 3)) % weather.length];
    const dayWeather = game.weather;
    $('weatherDay').textContent = `Day ${game.day}`;
    $('weatherIcon').textContent = dayWeather.icon;
    $('weatherName').textContent = dayWeather.name;
    $('weatherFoot').textContent = dayWeather.foot;
    $('weatherTag').textContent = dayWeather.tag;
    $('weatherNote').textContent = dayWeather.note;
  }

  function renderLedger() {
    const list = $('ledgerList');
    if (!game.history.length) {
      list.innerHTML = '<div class="ledger-empty">Your first day is waiting.<br>Every closeout will find a home here.</div>';
      return;
    }

    list.innerHTML = game.history.slice().reverse().map((entry) => `
      <div class="ledger-row">
        <div class="ledger-day">${entry.day}</div>
        <div class="ledger-info">
          <strong>${entry.variety || entry.weather} · ${entry.sold} cookies</strong>
          <span>${money(entry.price)} each · ${money(entry.revenue)} sales · ${money(entry.expenses)} costs</span>
        </div>
        <div class="ledger-profit ${entry.profit < 0 ? 'negative' : ''}">${entry.profit >= 0 ? '+' : ''}${money(entry.profit)}</div>
      </div>`).join('');
  }

  function render() {
    $('topDay').textContent = game.day;
    $('cashDisplay').textContent = money(game.cash);
    $('cashVal').textContent = money(game.cash);
    $('progressFill').style.width = `${((game.day - 1) / 30) * 100}%`;
    $('ledgerCount').textContent = `${game.history.length} / 30 days`;
    setWeather();
    renderLedger();
    updateEstimate();
  }

  function createVisitor(bundle, index, quiet = false) {
    const visitor = document.createElement('span');
    visitor.className = 'customer';
    visitor.setAttribute('aria-label', quiet ? 'A neighbor is peeking in' : `Customer buying ${bundle} cookies`);
    visitor.textContent = ['🧑🏻', '👩🏽', '🧔🏼', '👩🏻', '🧑🏾', '👨🏻', '👵🏼', '👩🏾', '🧒🏻', '🧑🏼', '👨🏽', '👩🏼', '👨🏾', '👩🏿'][index % 14];

    const cookie = document.createElement('span');
    cookie.className = 'cookie';
    cookie.textContent = quiet ? '👋' : (bundle > 1 ? `🍪×${bundle}` : '🍪');
    visitor.append(cookie);
    return visitor;
  }

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function animateCustomers(sold, runId) {
    const scene = $('shopScene');
    const floor = $('customerQueue');
    const prefersLessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visitors = sold > 0 ? Math.min(sold, 14) : 1;
    const bundleSize = sold > 0 ? Math.floor(sold / visitors) : 0;
    let remainder = sold > 0 ? sold % visitors : 0;
    let cookiesServed = 0;
    const gap = prefersLessMotion ? 80 : 240;
    const walkDuration = prefersLessMotion ? 40 : 1420;
    const doorMoment = walkDuration * 0.46;

    scene.className = 'shop-scene active';
    floor.replaceChildren();
    $('sceneCaption').textContent = sold > 0 ? 'Fresh cookies, right out of the oven!' : 'A quiet day on the block.';
    $('sceneSpeech').textContent = sold > 0 ? 'Doors open — come on in!' : 'Anyone fancy a cookie?';
    $('sceneCounter').textContent = `0 / ${sold} cookies sold`;
    scene.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const sceneRect = scene.getBoundingClientRect();
    const shopRect = $('shopfront').getBoundingClientRect();
    const endAt = Math.max(190, Math.min(sceneRect.width - 22, shopRect.left - sceneRect.left + shopRect.width - 39));
    const startAt = -48;

    const visits = Array.from({ length: visitors }, async (_, index) => {
      const cookiesForVisitor = sold > 0 ? bundleSize + (remainder-- > 0 ? 1 : 0) : 0;
      const visitor = createVisitor(cookiesForVisitor, index, sold === 0);
      floor.append(visitor);

      if (index) await pause(index * gap);
      if (runId !== game.runId) return;

      if (visitor.animate && !prefersLessMotion) {
        const animation = visitor.animate([
          { transform: `translate(${startAt}px, 0)`, opacity: 0, offset: 0 },
          { transform: `translate(${Math.max(105, endAt - 50)}px, 0)`, opacity: 1, offset: 0.4 },
          { transform: `translate(${endAt}px, 0)`, opacity: 1, offset: 0.46 },
          { transform: `translate(${endAt}px, 0)`, opacity: 1, offset: 0.68 },
          { transform: `translate(${sceneRect.width + 70}px, 0)`, opacity: 0, offset: 1 },
        ], { duration: walkDuration, easing: 'linear', fill: 'forwards' });

        await pause(doorMoment);
        if (runId !== game.runId) { animation.cancel(); return; }
        visitor.classList.add('buying');
      } else {
        visitor.style.transform = `translateX(${endAt}px)`;
        await pause(prefersLessMotion ? 50 : 500);
        if (runId !== game.runId) return;
        visitor.classList.add('buying');
      }

      if (cookiesForVisitor) {
        cookiesServed += cookiesForVisitor;
        $('sceneCounter').textContent = `${cookiesServed} / ${sold} cookies sold`;
        $('sceneSpeech').textContent = cookiesForVisitor > 1 ? `${cookiesForVisitor} warm cookies, coming up!` : 'One warm cookie, coming up!';
      } else {
        $('sceneSpeech').textContent = 'Just taking a peek!';
      }

      await pause(prefersLessMotion ? 60 : 430);
      if (runId !== game.runId) return;
      visitor.classList.remove('buying');
    });

    await Promise.all(visits);
    if (runId !== game.runId) return;

    if (sold > 0) {
      $('sceneCounter').textContent = `${sold} / ${sold} cookies sold`;
      $('sceneSpeech').textContent = 'Thanks for stopping by!';
      $('sceneCaption').textContent = 'That was a sweet day!';
    } else {
      $('sceneCaption').textContent = 'We’ll try again tomorrow.';
    }
    await pause(prefersLessMotion ? 100 : 250);
    return runId === game.runId;
  }

  async function openShop() {
    if (game.animating) return;
    if (game.closed) { advanceDay(); return; }

    const plan = { ...game.plan };
    const variety = selectedVariety();
    const expenses = plan.bake * variety.cost + plan.ad;
    if (expenses > game.cash + 1e-8) return;

    // Weather, advertising, and price shape the day's cookie demand.
    const baseDemand = 23 + (game.day * 7 % 11) + game.weather.boost + plan.ad * 1.6 + variety.demand;
    const priceFactor = clamp(2.65 - plan.price * 0.75, 0.35, 2.4);
    const demand = Math.max(0, Math.round(baseDemand * priceFactor));
    const sold = Math.min(plan.bake, demand);
    const revenue = sold * plan.price;
    const profit = revenue - expenses;
    game.cash = Math.round((game.cash + profit) * 100) / 100;

    const entry = { day: game.day, sold, revenue, expenses, profit, cash: game.cash, weather: game.weather.name, variety: variety.name, price: plan.price };
    game.history.push(entry);
    game.closed = true;
    game.animating = true;
    const runId = ++game.runId;

    $('openShop').disabled = true;
    $('openShop').textContent = 'Customers are on their way…';
    $('statusPill').textContent = 'Shop is open';
    $('statusPill').classList.remove('done');
    $('closeoutSubtitle').textContent = 'Watch the neighbors stop in for a cookie…';
    $('cashDisplay').textContent = money(game.cash);

    await animateCustomers(sold, runId);
    if (runId !== game.runId) return;
    finishDay(entry, plan);
  }

  function finishDay(entry, plan) {
    game.animating = false;
    $('soldVal').textContent = String(entry.sold);
    $('revenueVal').textContent = money(entry.revenue);
    $('expenseVal').textContent = money(entry.expenses);
    $('profitVal').textContent = `${entry.profit >= 0 ? '+' : ''}${money(entry.profit)}`;
    $('cashVal').textContent = money(game.cash);
    $('cashDisplay').textContent = money(game.cash);
    $('closeoutSubtitle').textContent = `${entry.variety} at ${money(plan.price)} each · ${plan.bake - entry.sold} left over`;
    $('statusPill').textContent = 'Day closed';
    $('statusPill').classList.add('done');
    $('profitBox').classList.toggle('loss', entry.profit < 0);
    $('profitBox').classList.toggle('profit', entry.profit >= 0);
    $('progressFill').style.width = `${(game.day / 30) * 100}%`;
    renderLedger();
    $('ledgerCount').textContent = `${game.history.length} / 30 days`;
    updateEstimate();

    if (game.day >= 30) window.setTimeout(showFinal, 650);
  }

  function advanceDay() {
    if (!game.closed || game.day >= 30) return;
    game.day += 1;
    game.closed = false;
    $('shopScene').classList.remove('active');
    $('customerQueue').replaceChildren();
    $('closeoutSubtitle').textContent = 'Your day-end numbers will land here.';
    $('statusPill').textContent = 'Awaiting close';
    $('statusPill').classList.remove('done');
    $('profitBox').classList.remove('loss');
    $('profitBox').classList.add('profit');
    ['soldVal', 'revenueVal', 'expenseVal', 'profitVal'].forEach((id) => { $(id).textContent = '—'; });
    $('cashVal').textContent = money(game.cash);
    game.plan = { bake: Math.max(0, Math.min(30, Math.floor(game.cash / 0.4))), variety: 'classic', price: 1.75, ad: 5 };
    setVariety(game.plan.variety, false);

    fields.forEach(([key, inputId, rangeId]) => {
      const value = game.plan[key];
      $(inputId).value = key === 'price' ? value.toFixed(2) : value;
      $(rangeId).value = clamp(value, Number($(rangeId).min), Number($(rangeId).max));
      $(`${key}Out`).textContent = formatValue(key, value);
    });
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showFinal() {
    const totalProfit = game.history.reduce((sum, entry) => sum + entry.profit, 0);
    const totalCookies = game.history.reduce((sum, entry) => sum + entry.sold, 0);
    $('modalEmoji').textContent = game.cash >= 100 ? '🏆' : game.cash > 0 ? '🍪' : '🥄';
    $('modalTitle').textContent = game.cash >= 100 ? 'A sweet first month!' : game.cash > 0 ? 'The ovens are cooling.' : 'A tough month on the block';
    $('modalCopy').textContent = game.cash >= 100
      ? `Thirty days behind the counter, and Askhat's shop has ${game.cash >= 250 ? 'become the talk of the neighborhood' : 'made it through the month with room to grow'}. Every good thing starts with a first batch.`
      : 'The last day is done. Every great baker learns from a slow season — tomorrow is another chance to find the right recipe.';
    $('finalCash').textContent = money(game.cash);
    $('finalSold').textContent = String(totalCookies);
    $('finalProfit').textContent = `${totalProfit >= 0 ? '+' : ''}${money(totalProfit)}`;
    $('overlay').classList.remove('hidden');
  }

  function reset() {
    game.runId += 1;
    game.day = 1;
    game.cash = 100;
    game.history = [];
    game.closed = false;
    game.animating = false;
    game.plan = { bake: 30, variety: 'classic', price: 1.75, ad: 5 };
    setVariety(game.plan.variety, false);
    $('overlay').classList.add('hidden');
    $('shopScene').classList.remove('active');
    $('customerQueue').replaceChildren();
    ['soldVal', 'revenueVal', 'expenseVal', 'profitVal'].forEach((id) => { $(id).textContent = '—'; });
    $('cashVal').textContent = money(100);
    $('closeoutSubtitle').textContent = 'Your day-end numbers will land here.';
    $('statusPill').textContent = 'Awaiting close';
    $('statusPill').classList.remove('done');
    $('profitBox').classList.remove('loss');
    $('profitBox').classList.add('profit');

    fields.forEach(([key, inputId, rangeId]) => {
      const value = game.plan[key];
      $(inputId).value = key === 'price' ? value.toFixed(2) : value;
      $(rangeId).value = clamp(value, Number($(rangeId).min), Number($(rangeId).max));
      $(`${key}Out`).textContent = formatValue(key, value);
    });
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('openShop').addEventListener('click', openShop);
  $('playAgain').addEventListener('click', reset);
  render();
})();
