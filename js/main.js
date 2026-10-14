"use strict";

const API = {
  projects: "https://webcraft-api.vercel.app/data/projects.json",
  courses: "https://webcraft-api.vercel.app/data/courses.json",
};

const store = { projects: [], courses: [] };

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const clean = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const show = (element, visible) => {
  element.hidden = !visible;
};

const debounce = (callback, delay = 250) => {
  let timer = null;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(callback, delay);
  };
};

const badges = (items) =>
  items.map((item) => `<li class="badge">${clean(item)}</li>`).join("");

const options = (values) =>
  values.map((value) => `<option>${clean(value)}</option>`).join("");

const loadData = async ({ url, label, loader, errorBox, onSuccess }) => {
  if (loader) show(loader, true);
  show(errorBox, false);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`réponse HTTP ${response.status}`);
    onSuccess(await response.json());
  } catch (error) {
    errorBox.textContent = `Impossible de charger ${label}. Vérifiez votre connexion puis rechargez la page (${error.message}).`;
    show(errorBox, true);
  } finally {
    if (loader) show(loader, false);
  }
};

let lastFocused = null;

const openModal = (modal) => {
  lastFocused = document.activeElement;
  show(modal, true);
  document.body.classList.add("has-modal");
  $(".modal-close", modal).focus();
};

const closeModal = (modal) => {
  if (modal.hidden) return;
  show(modal, false);
  document.body.classList.remove("has-modal");
  if (lastFocused) lastFocused.focus();
};

const initModals = () => {
  $$(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) closeModal(modal);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") $$(".modal").forEach(closeModal);
  });
};

const initNavigation = () => {
  const toggle = $(".nav-toggle");
  const nav = $("#main-nav");

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
};

const projectCard = (project) => `
  <article class="card">
    <img src="${clean(project.image)}" alt="Aperçu du projet ${clean(project.title)}" loading="lazy">
    <div class="card-body">
      <h3>${clean(project.title)}</h3>
      <p>Client : ${clean(project.client)}</p>
      <p class="card-meta">${clean(project.category)} &middot; ${clean(project.year)} &middot; ${clean(project.duration)}</p>
      <ul class="badges">${badges(project.technologies)}</ul>
      <p class="card-actions">
        <button class="btn btn-primary" type="button" data-id="${project.id}">Voir détails</button>
      </p>
    </div>
  </article>
`;

const projectDetails = (project) => `
  <img src="${clean(project.image)}" alt="Aperçu du projet ${clean(project.title)}">
  <p>${clean(project.description)}</p>
  <dl class="infos">
    <div><dt>Client</dt><dd>${clean(project.client)}</dd></div>
    <div><dt>Catégorie</dt><dd>${clean(project.category)}</dd></div>
    <div><dt>Année</dt><dd>${clean(project.year)}</dd></div>
    <div><dt>Durée</dt><dd>${clean(project.duration)}</dd></div>
  </dl>
  <h3>Technologies</h3>
  <ul class="badges">${badges(project.technologies)}</ul>
  <h3>Fonctionnalités</h3>
  <ul class="liste">${project.features.map((item) => `<li>${clean(item)}</li>`).join("")}</ul>
  <p class="modal-actions">
    <a class="btn btn-primary" href="${clean(project.url)}" target="_blank" rel="noopener">Visiter le site</a>
  </p>
`;

const courseCard = (course) => `
  <article class="card">
    <img src="${clean(course.image)}" alt="Illustration de la formation ${clean(course.title)}" loading="lazy">
    <div class="card-body">
      <h3>${clean(course.title)}</h3>
      <ul class="badges">
        <li class="badge">${clean(course.category)}</li>
        <li class="badge">${clean(course.level)}</li>
        <li class="badge ${course.available ? "badge-fort" : "badge-complet"}">${course.available ? "Disponible" : "Complet"}</li>
      </ul>
      <p class="card-meta">${clean(course.duration)} &middot; ★ ${clean(course.rating)} / 5 &middot; ${clean(course.students)} étudiants</p>
      <p class="card-price">${clean(course.price)} €</p>
      <ul class="badges">${badges(course.technologies)}</ul>
      <p class="card-actions">
        <button class="btn" type="button" data-id="${course.id}">Voir détails</button>
        <a class="btn btn-primary" href="inscription.html?formation=${course.id}">S'inscrire</a>
      </p>
    </div>
  </article>
`;

const courseDetails = (course) => `
  <img src="${clean(course.image)}" alt="Illustration de la formation ${clean(course.title)}">
  <p>${clean(course.description)}</p>
  <dl class="infos">
    <div><dt>Formateur</dt><dd>${clean(course.instructor)}</dd></div>
    <div><dt>Catégorie</dt><dd>${clean(course.category)}</dd></div>
    <div><dt>Niveau</dt><dd>${clean(course.level)}</dd></div>
    <div><dt>Durée</dt><dd>${clean(course.duration)}</dd></div>
    <div><dt>Tarif</dt><dd>${clean(course.price)} €</dd></div>
    <div><dt>Note</dt><dd>★ ${clean(course.rating)} / 5 (${clean(course.students)} étudiants)</dd></div>
  </dl>
  <h3>Technologies</h3>
  <ul class="badges">${badges(course.technologies)}</ul>
  <h3>Modules</h3>
  <ul class="liste">${course.modules.map((item) => `<li>${clean(item)}</li>`).join("")}</ul>
  <p class="modal-actions">
    <a class="btn btn-primary" href="inscription.html?formation=${course.id}">S'inscrire maintenant</a>
  </p>
`;

const CATALOGS = [
  {
    key: "projects",
    prefix: "project",
    url: API.projects,
    label: "les projets",
    noun: "projet",
    selects: { tech: "technologies", category: "categories" },
    texte: (project) => [project.title, project.client, project.description],
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
    texte: (course) => [course.title, course.description, course.instructor],
    match: (course, { category, level, tech }) =>
      (!category || course.category === category) &&
      (!level || course.level === level) &&
      (!tech || course.technologies.includes(tech)),
    card: courseCard,
    details: courseDetails,
  },
];

const initCatalog = (catalog) => {
  const grid = $(`#${catalog.prefix}-grid`);
  if (!grid) return;

  const search = $(`#${catalog.prefix}-search`);
  const empty = $(`#${catalog.prefix}-empty`);
  const count = $(`#${catalog.prefix}-count`);
  const modal = $(`#${catalog.prefix}-modal`);
  const selects = Object.keys(catalog.selects).map((name) => [
    name,
    $(`#${catalog.prefix}-${name}`),
  ]);

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const choix = Object.fromEntries(
      selects.map(([name, select]) => [name, select.value]),
    );
    const items = store[catalog.key].filter(
      (item) =>
        catalog.texte(item).join(" ").toLowerCase().includes(query) &&
        catalog.match(item, choix),
    );

    grid.innerHTML = items.map(catalog.card).join("");
    show(empty, items.length === 0);
    show(count, true);
    count.textContent = `${items.length} ${catalog.noun}${items.length > 1 ? "s" : ""} sur ${store[catalog.key].length}`;
  };

  search.addEventListener("input", debounce(render));
  selects.forEach(([, select]) => select.addEventListener("change", render));
  $(`#${catalog.prefix}-filters`).addEventListener("reset", () =>
    setTimeout(render),
  );

  grid.addEventListener("click", (event) => {
    const bouton = event.target.closest("[data-id]");
    if (!bouton) return;

    const item = store[catalog.key].find(
      (entry) => String(entry.id) === bouton.dataset.id,
    );
    $(`#${catalog.prefix}-modal-title`).textContent = item.title;
    $(`#${catalog.prefix}-modal-body`).innerHTML = catalog.details(item);
    openModal(modal);
  });

  loadData({
    url: catalog.url,
    label: catalog.label,
    loader: $(`#${catalog.prefix}-loader`),
    errorBox: $(`#${catalog.prefix}-error`),
    onSuccess: (data) => {
      store[catalog.key] = data[catalog.key];
      selects.forEach(([name, select]) => {
        select.innerHTML += options(data[catalog.selects[name]]);
      });
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
  course: (value) => (value ? "" : "Choisissez une formation."),
  level: (value) => (value ? "" : "Indiquez votre niveau."),
  motivation: (value) =>
    value.trim().length >= MOTIVATION_MIN
      ? ""
      : `Votre motivation doit contenir au moins ${MOTIVATION_MIN} caractères (actuellement ${value.trim().length}).`,
  experience: (value) =>
    !value.trim() || (Number(value) >= 0 && Number(value) <= 50)
      ? ""
      : "Saisissez un nombre d'années compris entre 0 et 50.",
};

const initSignupForm = () => {
  const form = $("#signup-form");
  if (!form) return;

  const courseSelect = $("#course");
  const motivation = $("#motivation");
  const counter = $("#motivation-counter");
  const globalError = $("#form-global-error");
  const fields = Object.keys(VALIDATORS).map((name) => form.elements[name]);

  const validate = (field) => {
    const message = VALIDATORS[field.name](field.value);
    const errorBox = $(`#${field.id}-error`);

    field.classList.toggle("is-invalid", message !== "");
    field.classList.toggle("is-valid", message === "" && field.value !== "");
    errorBox.textContent = message;
    show(errorBox, message !== "");

    return message === "";
  };

  const updateCounter = () => {
    const length = motivation.value.trim().length;
    counter.textContent = `${length} / ${MOTIVATION_MIN} caractères minimum`;
  };

  const resetStates = () => {
    fields.forEach((field) => {
      field.classList.remove("is-valid", "is-invalid");
      show($(`#${field.id}-error`), false);
    });
    show(globalError, false);
    updateCounter();
  };

  fields.forEach((field) => {
    field.addEventListener("blur", () => validate(field));
    field.addEventListener(
      field.tagName === "SELECT" ? "change" : "input",
      debounce(() => validate(field), 200),
    );
  });

  motivation.addEventListener("input", updateCounter);
  form.addEventListener("reset", () => setTimeout(resetStates));

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const invalid = fields.filter((field) => !validate(field));

    if (invalid.length) {
      globalError.textContent = `Le formulaire comporte ${invalid.length} champ${invalid.length > 1 ? "s" : ""} à corriger.`;
      show(globalError, true);
      invalid[0].focus();
      return;
    }

    const course = store.courses.find(
      (item) => String(item.id) === courseSelect.value,
    );
    $("#success-message").textContent = `Merci ${form.elements.firstname.value.trim()}, votre inscription à la formation « ${course.title} » est enregistrée.`;
    openModal($("#success-modal"));

    form.reset();
    resetStates();
  });

  updateCounter();

  loadData({
    url: API.courses,
    label: "la liste des formations",
    errorBox: $("#course-load-error"),
    onSuccess: (data) => {
      store.courses = data.courses;
      courseSelect.innerHTML =
        '<option value="">Sélectionnez une formation</option>' +
        store.courses
          .map(
            (course) =>
              `<option value="${course.id}"${course.available ? "" : " disabled"}>${clean(course.title)} (${clean(course.level)}, ${clean(course.price)} €)${course.available ? "" : " - complet"}</option>`,
          )
          .join("");

      const demande = new URLSearchParams(location.search).get("formation");
      if (demande) courseSelect.value = demande;
    },
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initModals();
  CATALOGS.forEach(initCatalog);
  initSignupForm();
});
