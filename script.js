// ==========================================
// OLIVIS EXPERTISE
// Gestion des plaintes et réclamations
// ==========================================

const $ = selector => document.querySelector(selector);
const complaints = [];
const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;
const supabaseConfigured = Boolean(
    window.supabase &&
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("VOTRE-PROJET") &&
    !supabaseAnonKey.includes("VOTRE_CLE")
);
const supabaseClient =
    supabaseConfigured
        ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
        : null;

const escapeHTML = value =>
    String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

function toast(message) {
    const notification = $("#toast");
    notification.textContent = message;
    notification.style.display = "block";
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        notification.style.display = "none";
    }, 3600);
}

function statusClass(status) {
    if (status === "Nouveau") return "new";
    if (status === "En cours") return "progress";
    return "resolved";
}

function displayDate(value) {
    return new Date(value).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function render() {
    const search = $("#searchInput").value.toLowerCase();
    const filter = $("#statusFilter").value;
    const filteredComplaints = complaints.filter(complaint => {
        const matchesStatus = filter === "all" || complaint.status === filter;
        const matchesSearch = [
            complaint.reference,
            complaint.name,
            complaint.subject,
            complaint.email
        ].some(value => String(value).toLowerCase().includes(search));
        return matchesStatus && matchesSearch;
    });

    $("#complaintRows").innerHTML = filteredComplaints.length
        ? filteredComplaints.map(complaint => `
            <tr>
                <td><span class="ref">${escapeHTML(complaint.reference)}</span></td>
                <td>
                    <div class="subject">${escapeHTML(complaint.subject)}</div>
                    <div class="subtext">${escapeHTML(complaint.name)}</div>
                </td>
                <td>${escapeHTML(displayDate(complaint.submitted_at))}</td>
                <td><span class="pill ${statusClass(complaint.status)}">${escapeHTML(complaint.status)}</span></td>
                <td>
                    <button class="text-btn" data-open="${escapeHTML(complaint.reference)}">
                        Gérer →
                    </button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="5" class="empty">Aucun dossier ne correspond à votre recherche.</td></tr>`;

    $("#rowCount").textContent =
        `${filteredComplaints.length} dossier${filteredComplaints.length !== 1 ? "s" : ""}`;
    $("#statTotal").textContent = complaints.length;
    $("#statNew").textContent =
        complaints.filter(complaint => complaint.status === "Nouveau").length;
    $("#statProgress").textContent =
        complaints.filter(complaint => complaint.status === "En cours").length;
    $("#statResolved").textContent =
        complaints.filter(complaint => complaint.status === "Résolu").length;

    document.querySelectorAll("[data-open]").forEach(button => {
        button.addEventListener("click", () => manageComplaint(button.dataset.open));
    });
}

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.toggle("active", section.id === sectionId);
    });
    document.querySelectorAll("[data-section]").forEach(button => {
        button.classList.toggle("active", button.dataset.section === sectionId);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStaffSession(user) {
    const signedIn = Boolean(user);
    $("#loginPanel").hidden = signedIn;
    $("#staffSession").hidden = !signedIn;
    $("#adminContent").hidden = !signedIn;
    $("#staffIdentity").textContent = signedIn ? user.email : "";
    $("#connectionStatus").textContent = signedIn
        ? "Connecté à Supabase"
        : supabaseClient
            ? "Supabase configuré · connexion requise"
            : "Supabase non configuré";
    if (signedIn) {
        window.setTimeout(loadComplaints, 0);
    } else {
        complaints.splice(0, complaints.length);
        render();
    }
}

async function loadComplaints() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
        .from("complaints")
        .select("*")
        .order("submitted_at", { ascending: false });

    if (error) {
        console.error("Erreur lors du chargement des réclamations :", error);
        toast("Impossible de charger les dossiers. Vérifiez la configuration Supabase.");
        return;
    }

    complaints.splice(0, complaints.length, ...data);
    render();
}

async function manageComplaint(reference) {
    const complaint = complaints.find(item => item.reference === reference);
    if (!complaint) return;

    const choices = ["Nouveau", "En cours", "Résolu"];
    const answer = prompt(
        `Gestion de ${complaint.reference}\n` +
        `Client : ${complaint.name}\n` +
        `Sujet : ${complaint.subject}\n` +
        `Statut actuel : ${complaint.status}\n\n` +
        "Saisissez le nouveau statut :\n1 = Nouveau\n2 = En cours\n3 = Résolu",
        String(choices.indexOf(complaint.status) + 1)
    );
    if (answer === null) return;

    const choice = Number(answer);
    if (![1, 2, 3].includes(choice)) {
        toast("Choisissez 1, 2 ou 3 pour le statut.");
        return;
    }

    const previousStatus = complaint.status;
    const previousEvents = complaint.events;
    const status = choices[choice - 1];
    const eventDetails = {
        "Nouveau": ["Statut mis à jour", "La réclamation attend son traitement."],
        "En cours": ["Dossier pris en charge", "Un agent prend en charge la réclamation."],
        "Résolu": ["Dossier résolu", "La réclamation a été marquée comme résolue."]
    }[status];
    const events = [
        ...complaint.events,
        { title: eventDetails[0], description: eventDetails[1], at: new Date().toISOString() }
    ];

    const { error } = await supabaseClient
        .from("complaints")
        .update({ status, events })
        .eq("reference", reference);

    if (error) {
        console.error("Erreur lors de la mise à jour du dossier :", error);
        toast("Impossible de mettre à jour le dossier.");
        complaint.status = previousStatus;
        complaint.events = previousEvents;
        return;
    }

    complaint.status = status;
    complaint.events = events;
    render();
    toast(`Statut mis à jour : ${status}.`);
}

async function submitComplaint(event) {
    event.preventDefault();
    if (!supabaseClient) {
        toast("Supabase n'est pas configuré. Renseignez l'URL et la clé publique du projet.");
        return;
    }

    const description = $("#description").value.trim();
    if (description.length < 15) {
        toast("Décrivez votre demande en au moins 15 caractères.");
        return;
    }

    const reference = `RF-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const events = [{
        title: "Réclamation reçue",
        description: "Votre demande a bien été enregistrée.",
        at: new Date().toISOString()
    }];
    const complaint = {
        reference,
        name: $("#clientName").value.trim(),
        email: $("#clientEmail").value.trim(),
        phone: $("#clientPhone").value.trim() || null,
        subject: $("#subject").value.trim(),
        category: $("#category").value,
        description,
        status: "Nouveau",
        events
    };

    const { error } = await supabaseClient.from("complaints").insert(complaint);
    if (error) {
        console.error("Erreur lors de l'enregistrement de la réclamation :", error);
        toast("La réclamation n'a pas pu être enregistrée. Réessayez plus tard.");
        return;
    }

    $("#complaintForm").reset();
    showSection("track");
    $("#trackRef").value = reference;
    await lookupComplaint(reference);
    toast(`Réclamation enregistrée. Référence : ${reference}`);
}

async function lookupComplaint(reference) {
    const result = $("#trackResult");
    result.style.display = "block";
    result.textContent = "Recherche du dossier…";
    if (!supabaseClient) {
        result.textContent = "Le suivi sera disponible après la configuration de Supabase.";
        return;
    }

    const { data, error } = await supabaseClient.rpc("lookup_complaint", {
        complaint_reference: reference
    });
    if (error) {
        console.error("Erreur lors de la recherche du dossier :", error);
        result.textContent = "Impossible de rechercher le dossier pour le moment.";
        return;
    }

    const complaint = data?.[0];
    if (!complaint) {
        result.innerHTML = `
            <strong>Dossier introuvable</strong>
            <p class="muted">Vérifiez la référence saisie et réessayez.</p>
        `;
        return;
    }

    const events = Array.isArray(complaint.events) ? complaint.events : [];
    const timeline = events.map(item => `
        <div class="timeline-item">
            <span class="dot"></span>
            <div>
                <strong>${escapeHTML(item.title)}</strong>
                <p>${escapeHTML(item.description)}</p>
            </div>
        </div>
    `).join("");
    const nextStep = {
        "Résolu": "Ce dossier est marqué comme résolu. Si le problème persiste, contactez le service client.",
        "En cours": "Votre demande est en cours de traitement. Consultez régulièrement cette page pour voir les mises à jour.",
        "Nouveau": "Votre demande a été enregistrée et attend sa prise en charge."
    }[complaint.status];

    result.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
            <div>
                <div class="subtext">RÉFÉRENCE DU DOSSIER</div>
                <div class="ref" style="font-size:16px;margin:4px 0 9px">${escapeHTML(complaint.reference)}</div>
                <strong>${escapeHTML(complaint.subject)}</strong>
                <div class="subtext">Déposée le ${escapeHTML(displayDate(complaint.submitted_at))}</div>
            </div>
            <span class="pill ${statusClass(complaint.status)}">${escapeHTML(complaint.status)}</span>
        </div>
        <div class="timeline">${timeline}</div>
        <div class="note"><strong>Prochaine étape</strong>${escapeHTML(nextStep)}</div>
    `;
}

document.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", () => showSection(button.dataset.section));
});

$("#quickNew").addEventListener("click", () => showSection("new"));
$("#searchInput").addEventListener("input", render);
$("#statusFilter").addEventListener("change", render);

$("#staffLogin").addEventListener("submit", async event => {
    event.preventDefault();
    if (!supabaseClient) {
        toast("Renseignez d'abord l'URL et la clé publique dans supabase-config.js.");
        return;
    }
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: $("#staffEmail").value.trim(),
        password: $("#staffPassword").value
    });
    if (error) {
        console.error("Erreur de connexion du personnel :", error);
        toast("Connexion refusée. Vérifiez vos identifiants.");
        return;
    }
    $("#staffLogin").reset();
});

$("#staffLogout").addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error("Erreur lors de la déconnexion :", error);
        toast("Impossible de terminer la session.");
    }
});

$("#complaintForm").addEventListener("submit", submitComplaint);
$("#clearForm").addEventListener("click", () => $("#complaintForm").reset());
$("#trackForm").addEventListener("submit", async event => {
    event.preventDefault();
    await lookupComplaint($("#trackRef").value.trim());
});

render();

if (!supabaseClient) {
    $("#connectionStatus").textContent = "Supabase non configuré";
    toast("Configurez l'URL et la clé publique Supabase dans supabase-config.js.");
} else {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        setStaffSession(session?.user ?? null);
    });
}
