document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- DEWPOINT : dernier relevé public ---------- */
(function () {
    const box = document.getElementById('live');
    const title = document.getElementById('live-title');
    const sub = document.getElementById('live-sub');
    const metrics = document.getElementById('live-metrics');
    const fmt = (v, unit) => v == null ? '–' : Number(v).toLocaleString('fr-BE', {maximumFractionDigits: 1}) + unit;

    function ago(iso) {
        const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
        if (min < 1) return "à l'instant";
        if (min < 60) return 'il y a ' + min + ' min';
        const h = Math.round(min / 60);
        if (h < 48) return 'il y a ' + h + ' h';
        return 'il y a ' + Math.round(h / 24) + ' j';
    }

    function fallback() {
        title.textContent = 'Carte en direct';
        sub.textContent = 'Les relevés sont visibles sur la carte DEWPOINT.';
    }

    fetch('/dewpoint/api/v1/map', {headers: {'Accept': 'application/json'}})
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(sites => {
            // Le relevé le plus récent, tous sites confondus. Un capteur sans mesure
            // (temperature null) n'est pas un capteur à zéro degré : on l'ignore.
            let best = null;
            for (const s of sites) {
                for (const d of (s.devices || [])) {
                    if (d.temperature == null || !d.measuredAt) continue;
                    if (!best || new Date(d.measuredAt) > new Date(best.d.measuredAt)) best = {s, d};
                }
            }
            if (!best) return fallback();

            const {s, d} = best;
            document.getElementById('m-temp').textContent = fmt(d.temperature, ' °C');
            document.getElementById('m-hum').textContent = fmt(d.humidity, ' %');
            document.getElementById('m-dew').textContent = fmt(d.dewPoint, ' °C');
            title.textContent = d.status === 'ONLINE' ? 'En direct' : 'Dernier relevé';
            sub.textContent = s.name + ' · ' + ago(d.measuredAt);
            if (d.status === 'ONLINE') box.classList.add('is-live');
            metrics.hidden = false;
        })
        .catch(fallback);
})();

/* ---------- Bulles d'information ---------- */
(function () {
    const INFOS = {
        watchdog: {
            kicker: 'Watchdog',
            title: 'Un « chien de garde »',
            text: "Un processus qui tourne en arrière-plan et vérifie régulièrement que chaque capteur " +
                "donne signe de vie. Si l'un d'eux se tait trop longtemps, il ouvre une alerte ; " +
                "dès qu'un relevé revient, il la referme tout seul."
        },
        hmac: {
            kicker: 'HMAC',
            title: 'Une signature pour chaque relevé',
            text: "Le capteur et le serveur partagent un secret qui ne circule jamais sur le réseau. " +
                "Le capteur s'en sert pour sceller chaque relevé ; le serveur refait le calcul et compare. " +
                "Un chiffre modifié en route, ou un envoyeur sans le secret, et le relevé est refusé."
        },
        pwa: {
            kicker: 'PWA',
            title: "Un site qui s'installe comme une app",
            text: "Progressive Web App : un site web qu'on ajoute à l'écran d'accueil d'un téléphone " +
                "ou d'un ordinateur. Il s'ouvre en plein écran, comme une application, et peut " +
                "envoyer des notifications, sans passer par un store."
        },
        localstorage: {
            kicker: 'localStorage',
            title: 'La mémoire du navigateur',
            text: "Un petit espace de stockage que chaque navigateur réserve à un site. Les tâches y " +
                "sont enregistrées à chaque changement : on peut fermer l'onglet, elles sont toujours " +
                "là au retour. Aucun serveur, aucun compte, mais elles ne quittent pas cet appareil."
        },
        hooks: {
            kicker: 'Hooks React',
            title: 'Donner une mémoire aux composants',
            text: "Des fonctions fournies par React. useState retient une valeur, ici la liste des " +
                "tâches, et redessine l'écran dès qu'elle change. useEffect déclenche une action " +
                "après chaque mise à jour, comme la sauvegarde dans le navigateur."
        }
    };

    const modal = document.getElementById('info-modal');
    if (!modal || typeof modal.showModal !== 'function') return;

    document.querySelectorAll('.term[data-info]').forEach(btn => {
        btn.addEventListener('click', () => {
            const info = INFOS[btn.dataset.info];
            if (!info) return;
            document.getElementById('info-kicker').textContent = info.kicker;
            document.getElementById('info-title').textContent = info.title;
            document.getElementById('info-text').textContent = info.text;
            modal.showModal();
        });
    });

    modal.querySelector('.info-close').addEventListener('click', () => modal.close());

    // Clic sur le voile (hors de la carte) = fermer. Échap est géré nativement par <dialog>.
    modal.addEventListener('click', e => {
        const r = modal.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) modal.close();
    });
})();

/* ---------- Formulaire (inactif tant que #notify-form n'est pas dans la page) ---------- */
const form = document.getElementById('notify-form');
const msgOk = document.getElementById('form-success');
const msgErr = document.getElementById('form-error');

if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '…';
    msgErr.classList.remove('error');

    try {
        const res = await fetch(form.action, {
            method: 'POST',
            body: new URLSearchParams(new FormData(form)),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        if (!res.ok) throw new Error();
        form.style.display = 'none';
        msgOk.classList.add('success');
    } catch {
        btn.disabled = false;
        btn.textContent = 'Me notifier';
        msgErr.classList.add('error');
    }
});
