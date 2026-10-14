"use strict";

const API = {
  projects: "https://webcraft-api.vercel.app/data/projects.json",
  courses: "https://webcraft-api.vercel.app/data/courses.json",
};

const store = { projects: [], courses: [] };

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const debounce = (callback, delay = 250) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
};

const show = (element, visible) => {
  if (element) element.hidden = !visible;
};

const badgeList = (items = []) =>
  items.map((item) => `<li class="badge">${escapeHtml(item)}</li>`).join("");

const fillSelect = (select, values = []) =>
  select.insertAdjacentHTML(
    "beforeend",
    values.map((value) => `<option>${escapeHtml(value)}</option>`).join(""),
  );

const availabilityBadge = (course) =>
  `<li class="badge ${course.available ? "badge-available" : "badge-full"}">${
    course.available ? "Disponible" : "Complet"
  }</li>`;

const loadData = async ({ url, label, loader, errorBox, onSuccess }) => {
  show(loader, true);
  show(errorBox, false);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`réponse HTTP ${response.status}`);
    onSuccess(await response.json());
  } catch (error) {
    errorBox.textContent = `Impossible de charger ${label}. Vérifiez votre connexion puis rechargez la page (${error.message}).`;
    show(errorBox, true);
  } finally {
    show(loader, false);
  }
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
let lastFocused = null;

const openModal = (modal) => {
  lastFocused = document.activeElement;
  show(modal, true);
  document.body.classList.add("has-modal");
  $(FOCUSABLE, modal)?.focus();
};

const closeModal = (modal) => {
  if (modal.hidden) return;
  show(modal, false);
  document.body.classList.remove("has-modal");
  lastFocused?.focus();
  lastFocused = null;
};

const initModals = () => {
  $$(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) closeModal(modal);
    });

    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;

      const focusables = $$(FOCUSABLE, modal).filter((el) => el.offsetParent);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") $$(".modal").forEach(closeModal);
  });
};

const initNavigation = () => {
  const toggle = $(".nav-toggle");
  const nav = $("#main-nav");

  const close = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Ouvrir le menu de navigation");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      `${isOpen ? "Fermer" : "Ouvrir"} le menu de navigation`,
    );
  });

  $$(".nav-link", nav).forEach((link) => link.addEventListener("click", close));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      close();
      toggle.focus();
    }
  });
};

const projectCard = (project) => `
  <article class="card">
    <div class="card-media">
      <img src="${escapeHtml(project.image)}" alt="Aperçu du projet ${escapeHtml(project.title)}"
           loading="lazy" width="800" height="450">
      <span class="badge badge-category">${escapeHtml(project.category)}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(project.title)}</h3>
      <p class="card-client">Client : <strong>${escapeHtml(project.client)}</strong></p>
      <p class="card-meta">
        <span>${escapeHtml(project.year)}</span>
        <span>${escapeHtml(project.duration)}</span>
      </p>
      <ul class="badge-list">${badgeList(project.technologies)}</ul>
      <div class="card-actions">
        <button class="btn btn-primary" type="button" data-details="${escapeHtml(project.id)}">
          Voir détails
        </button>
      </div>
    </div>
  </article>
`;

const projectDetails = (project) => `
  <div class="modal-media">
    <img src="${escapeHtml(project.image)}" alt="Aperçu du projet ${escapeHtml(project.title)}"
         width="800" height="450">
  </div>
  <p>${escapeHtml(project.description)}</p>
  <dl class="info-grid">
    <div><dt>Client</dt><dd>${escapeHtml(project.client)}</dd></div>
    <div><dt>Catégorie</dt><dd>${escapeHtml(project.category)}</dd></div>
    <div><dt>Année</dt><dd>${escapeHtml(project.year)}</dd></div>
    <div><dt>Durée</dt><dd>${escapeHtml(project.duration)}</dd></div>
  </dl>
  <h3>Technologies utilisées</h3>
  <ul class="badge-list">${badgeList(project.technologies)}</ul>
  <h3>Fonctionnalités clés</h3>
  <ul class="check-list">
    ${(project.features ?? []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
  </ul>
  <div class="modal-actions">
    <a class="btn btn-primary" href="${escapeHtml(project.url)}" target="_blank" rel="noopener">
      Visiter le site du projet
    </a>
  </div>
`;

const courseCard = (course) => `
  <article class="card">
    <div class="card-media">
      <img src="${escapeHtml(course.image)}" alt="Illustration de la formation ${escapeHtml(course.title)}"
           loading="lazy" width="800" height="450">
      <span class="badge badge-category">${escapeHtml(course.category)}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(course.title)}</h3>
      <ul class="badge-list">
        <li class="badge badge-level">${escapeHtml(course.level)}</li>
        ${availabilityBadge(course)}
      </ul>
      <p class="card-meta">
        <span>${escapeHtml(course.duration)}</span>
        <span class="rating"><span class="rating-star" aria-hidden="true">&#9733;</span> ${escapeHtml(course.rating)} / 5</span>
        <span>${escapeHtml(course.students)} étudiants</span>
      </p>
      <p class="card-price">${escapeHtml(course.price)} &euro;</p>
      <ul class="badge-list">${badgeList(course.technologies)}</ul>
      <div class="card-actions">
        <button class="btn btn-ghost" type="button" data-details="${escapeHtml(course.id)}">
          Voir détails
        </button>
        <a class="btn btn-primary" href="inscription.html?formation=${escapeHtml(course.id)}">S'inscrire</a>
      </div>
    </div>
  </article>
`;

const courseDetails = (course) => `
  <div class="modal-media">
    <img src="${escapeHtml(course.image)}" alt="Illustration de la formation ${escapeHtml(course.title)}"
         width="800" height="450">
  </div>
  <ul class="badge-list">
    <li class="badge badge-category">${escapeHtml(course.category)}</li>
    <li class="badge badge-level">${escapeHtml(course.level)}</li>
    ${availabilityBadge(course)}
  </ul>
  <p>${escapeHtml(course.description)}</p>
  <dl class="info-grid">
    <div><dt>Formateur</dt><dd>${escapeHtml(course.instructor)}</dd></div>
    <div><dt>Durée</dt><dd>${escapeHtml(course.duration)}</dd></div>
    <div><dt>Tarif</dt><dd>${escapeHtml(course.price)} &euro;</dd></div>
    <div><dt>Note moyenne</dt><dd><span class="rating-star" aria-hidden="true">&#9733;</span> ${escapeHtml(course.rating)} / 5</dd></div>
    <div><dt>Étudiants inscrits</dt><dd>${escapeHtml(course.students)}</dd></div>
    <div><dt>Niveau requis</dt><dd>${escapeHtml(course.level)}</dd></div>
  </dl>
  <h3>Technologies abordées</h3>
  <ul class="badge-list">${badgeList(course.technologies)}</ul>
  <h3>Modules du programme</h3>
  <ul class="check-list">
    ${(course.modules ?? []).map((module) => `<li>${escapeHtml(module)}</li>`).join("")}
  </ul>
  <div class="modal-actions">
    <a class="btn btn-accent" href="inscription.html?formation=${escapeHtml(course.id)}">S'inscrire maintenant</a>
  </div>
`;

const CATALOGS = [
  {
    key: "projects",
    prefix: "project",
    url: API.projects,
    label: "les projets",
    noun: "projet",
    selects: { tech: "technologies", category: "categories" },
    searchable: (project) => [
      project.title,
      project.client,
      project.description,
      project.category,
      ...project.technologies,
    ],
    match: (project, { tech, category }) =>
      (!tech || project.technologies.includes(tech)) &&
      (!category || project.category === category),
    card: projectCard,
    details: projectDetails,
  },
  {
    key: "courses",
    prefix: "course",
    url: API.courses,
    label: "les formations",
    noun: "formation",
    selects: { category: "categories", level: "levels", tech: "technologies" },
    searchable: (course) => [
      course.title,
      course.description,
      course.instructor,
      course.category,
      ...course.technologies,
    ],
    match: (course, { category, level, tech }) =>
      (!category || course.category === category) &&
      (!level || course.level === level) &&
      (!tech || course.technologies.includes(tech)),
    card: courseCard,
    details: courseDetails,
  },
];

const initCatalog = ({
  key,
  prefix,
  url,
  label,
  noun,
  selects,
  searchable,
  match,
  card,
  details,
}) => {
  const grid = $(`#${prefix}-grid`);
  if (!grid) return;

  const search = $(`#${prefix}-search`);
  const empty = $(`#${prefix}-empty`);
  const count = $(`#${prefix}-count`);
  const modal = $(`#${prefix}-modal`);
  const filters = Object.keys(selects).map((name) => [
    name,
    $(`#${prefix}-${name}`),
  ]);

  const render = () => {
    const query = normalize(search.value.trim());
    const values = Object.fromEntries(
      filters.map(([name, select]) => [name, select.value]),
    );

    const results = store[key].filter(
      (item) =>
        (!query || normalize(searchable(item).join(" ")).includes(query)) &&
        match(item, values),
    );

    grid.innerHTML = results.map(card).join("");
    show(empty, results.length === 0);
    show(count, true);
    count.textContent = `${results.length} ${noun}${results.length > 1 ? "s" : ""} sur ${store[key].length}`;
  };

  search.addEventListener("input", debounce(render));
  filters.forEach(([, select]) => select.addEventListener("change", render));
  $(`#${prefix}-filters`).addEventListener("reset", () => setTimeout(render, 0));

  grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-details]");
    if (!trigger) return;

    const item = store[key].find(
      (entry) => String(entry.id) === trigger.dataset.details,
    );

    $(`#${prefix}-modal-title`).textContent = item.title;
    $(`#${prefix}-modal-body`).innerHTML = details(item);
    openModal(modal);
  });

  loadData({
    url,
    label,
    loader: $(`#${prefix}-loader`),
    errorBox: $(`#${prefix}-error`),
    onSuccess: (data) => {
      store[key] = data[key] ?? [];
      filters.forEach(([name, select]) => fillSelect(select, data[selects[name]]));
      render();
    },
  });
};

const MOTIVATION_MIN = 50;

const VALIDATORS = {
  firstname: (value) =>
    value.trim().length >= 2
      ? ""
      : "Le prénom doit contenir au moins 2 caractères.",
  lastname: (value) =>
    value.trim().length >= 2 ? "" : "Le nom doit contenir au moins 2 caractères.",
  email: (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? ""
      : "Adresse e-mail invalide (exemple : prenom.nom@exemple.fr).",
  phone: (value) =>
    /^\+[0-9]{8,15}$/.test(value.replace(/[\s.-]/g, ""))
      ? ""
      : "Numéro au format international attendu (exemple : +33 6 12 34 56 78).",
  course: (value) => (value ? "" : "Choisissez la formation qui vous intéresse."),
  level: (value) => (value ? "" : "Indiquez votre niveau actuel."),
  motivation: (value) =>
    value.trim().length >= MOTIVATION_MIN
      ? ""
      : `Votre motivation doit contenir au moins ${MOTIVATION_MIN} caractères (actuellement ${value.trim().length}).`,
  experience: (value) => {
    if (!value.trim()) return "";
    const years = Number(value);
    return Number.isInteger(years) && years >= 0 && years <= 50
      ? ""
      : "Saisissez un nombre entier d'années compris entre 0 et 50.";
  },
};

const initSignupForm = () => {
  const form = $("#signup-form");
  if (!form) return;

  const courseSelect = $("#course");
  const motivation = $("#motivation");
  const counter = $("#motivation-counter");
  const globalError = $("#form-global-error");
  const summary = $("#summary-content");
  const fields = Object.keys(VALIDATORS).map((name) => form.elements[name]);

  const validate = (field) => {
    const message = VALIDATORS[field.name](field.value);
    const errorBox = $(`#${field.id}-error`);

    field.classList.toggle("is-invalid", message !== "");
    field.classList.toggle("is-valid", message === "" && field.value.trim() !== "");
    field.setAttribute("aria-invalid", String(message !== ""));
    errorBox.textContent = message;
    show(errorBox, message !== "");

    return message === "";
  };

  const clearStates = () => {
    fields.forEach((field) => {
      field.classList.remove("is-valid", "is-invalid");
      field.removeAttribute("aria-invalid");
      show($(`#${field.id}-error`), false);
    });
    show(globalError, false);
  };

  const updateCounter = () => {
    const length = motivation.value.trim().length;
    counter.textContent = `${length} / ${MOTIVATION_MIN} caractères minimum`;
    counter.classList.toggle("counter-ok", length >= MOTIVATION_MIN);
  };

  const selectedCourse = () =>
    store.courses.find((course) => String(course.id) === courseSelect.value);

  const updateSummary = () => {
    const course = selectedCourse();

    summary.innerHTML = course
      ? `<h3 class="card-title">${escapeHtml(course.title)}</h3>
         <ul class="badge-list">
           <li class="badge badge-category">${escapeHtml(course.category)}</li>
           <li class="badge badge-level">${escapeHtml(course.level)}</li>
           ${availabilityBadge(course)}
         </ul>
         <p class="summary-price">${escapeHtml(course.price)} &euro;</p>
         <dl class="info-grid">
           <div><dt>Formateur</dt><dd>${escapeHtml(course.instructor)}</dd></div>
           <div><dt>Durée</dt><dd>${escapeHtml(course.duration)}</dd></div>
         </dl>`
      : '<p class="muted">Sélectionnez une formation pour afficher son détail.</p>';
  };

  fields.forEach((field) => {
    field.addEventListener("blur", () => validate(field));
    field.addEventListener(
      field.tagName === "SELECT" ? "change" : "input",
      debounce(() => validate(field), 200),
    );
  });

  motivation.addEventListener("input", updateCounter);
  courseSelect.addEventListener("change", updateSummary);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const invalid = fields.filter((field) => !validate(field));

    if (invalid.length) {
      globalError.textContent = `Le formulaire comporte ${invalid.length} champ${invalid.length > 1 ? "s" : ""} à corriger. Les erreurs sont signalées ci-dessous.`;
      show(globalError, true);
      invalid[0].focus();
      return;
    }

    $("#success-message").textContent = `Merci ${form.elements.firstname.value.trim()}, votre inscription à la formation « ${selectedCourse().title} » est enregistrée.`;
    openModal($("#success-modal"));

    form.reset();
    clearStates();
    updateCounter();
    updateSummary();
  });

  form.addEventListener("reset", () =>
    setTimeout(() => {
      clearStates();
      updateCounter();
      updateSummary();
    }, 0),
  );

  updateCounter();

  loadData({
    url: API.courses,
    label: "la liste des formations",
    errorBox: $("#course-load-error"),
    onSuccess: (data) => {
      store.courses = data.courses ?? [];
      courseSelect.innerHTML =
        '<option value="">Sélectionnez une formation</option>' +
        store.courses
          .map(
            (course) =>
              `<option value="${escapeHtml(course.id)}"${course.available ? "" : " disabled"}>${escapeHtml(course.title)} - ${escapeHtml(course.level)} - ${escapeHtml(course.price)} EUR${course.available ? "" : " (complet)"}</option>`,
          )
          .join("");

      const requested = new URLSearchParams(location.search).get("formation");
      if (requested && courseSelect.querySelector(`option[value="${requested}"]`)) {
        courseSelect.value = requested;
        $("#level").focus();
      }

      updateSummary();
    },
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initModals();
  CATALOGS.forEach(initCatalog);
  initSignupForm();
});
