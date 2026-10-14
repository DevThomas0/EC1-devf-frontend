"use strict";

const API_URL = "https://webcraft-api.vercel.app/data/";
const MOTIVATION_MIN_LENGTH = 50;

const store = { projects: [], courses: [] };

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeUrl = (url) => (/^https?:\/\//i.test(url) ? url : "#");

const show = (element, visible) => {
  element.hidden = !visible;
};

const plural = (count, noun) => `${count} ${noun}${count > 1 ? "s" : ""}`;

const debounce = (callback, delay = 250) => {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(callback, delay);
  };
};

const itemsOf = (items, className = "") =>
  items.map((item) => `<li class="${className}">${escapeHtml(item)}</li>`).join("");

const badgesOf = (items) => `<ul class="badges">${itemsOf(items, "badge")}</ul>`;

const infoOf = (rows) =>
  `<dl class="info">${rows
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("")}</dl>`;

const optionsOf = (values) =>
  values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");

const loadData = async ({ file, label, loader, errorBox, onSuccess }) => {
  if (loader) show(loader, true);
  show(errorBox, false);

  try {
    const response = await fetch(API_URL + file);
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
  lastFocused?.focus();
};

const initModals = () => {
  document.addEventListener("click", (event) => {
    const closer = event.target.closest("[data-close-modal]");
    if (closer) closeModal(closer.closest(".modal"));
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
    <img src="${escapeHtml(project.image)}" alt="Aperçu du projet ${escapeHtml(project.title)}" loading="lazy">
    <div class="card-body">
      <h3>${escapeHtml(project.title)}</h3>
      <p>Client : ${escapeHtml(project.client)}</p>
      <p class="card-meta">${escapeHtml(project.category)} &middot; ${escapeHtml(project.year)} &middot; ${escapeHtml(project.duration)}</p>
      ${badgesOf(project.technologies)}
      <p class="card-actions">
        <button class="btn btn-primary" type="button" data-id="${escapeHtml(project.id)}">Voir détails</button>
      </p>
    </div>
  </article>
`;

const projectDetails = (project) => `
  <img src="${escapeHtml(project.image)}" alt="Aperçu du projet ${escapeHtml(project.title)}">
  <p>${escapeHtml(project.description)}</p>
  ${infoOf([
    ["Client", project.client],
    ["Catégorie", project.category],
    ["Année", project.year],
    ["Durée", project.duration],
  ])}
  <h3>Technologies</h3>
  ${badgesOf(project.technologies)}
  <h3>Fonctionnalités</h3>
  <ul class="list">${itemsOf(project.features)}</ul>
  <p class="modal-actions">
    <a class="btn btn-primary" href="${escapeHtml(safeUrl(project.url))}" target="_blank" rel="noopener">Visiter le site</a>
  </p>
`;

const courseCard = (course) => `
  <article class="card">
    <img src="${escapeHtml(course.image)}" alt="Illustration de la formation ${escapeHtml(course.title)}" loading="lazy">
    <div class="card-body">
      <h3>${escapeHtml(course.title)}</h3>
      <ul class="badges">
        <li class="badge">${escapeHtml(course.category)}</li>
        <li class="badge">${escapeHtml(course.level)}</li>
        <li class="badge ${course.available ? "badge-strong" : "badge-full"}">${course.available ? "Disponible" : "Complet"}</li>
      </ul>
      <p class="card-meta">${escapeHtml(course.duration)} &middot; ★ ${escapeHtml(course.rating)} / 5 &middot; ${escapeHtml(course.students)} étudiants</p>
      <p class="card-price">${escapeHtml(course.price)} €</p>
      ${badgesOf(course.technologies)}
      <p class="card-actions">
        <button class="btn" type="button" data-id="${escapeHtml(course.id)}">Voir détails</button>
        <a class="btn btn-primary" href="inscription.html?formation=${encodeURIComponent(course.id)}">S'inscrire</a>
      </p>
    </div>
  </article>
`;

const courseDetails = (course) => `
  <img src="${escapeHtml(course.image)}" alt="Illustration de la formation ${escapeHtml(course.title)}">
  <p>${escapeHtml(course.description)}</p>
  ${infoOf([
    ["Formateur", course.instructor],
    ["Catégorie", course.category],
    ["Niveau", course.level],
    ["Durée", course.duration],
    ["Tarif", `${course.price} €`],
    ["Note", `★ ${course.rating} / 5 (${course.students} étudiants)`],
  ])}
  <h3>Technologies</h3>
  ${badgesOf(course.technologies)}
  <h3>Modules</h3>
  <ul class="list">${itemsOf(course.modules)}</ul>
  <p class="modal-actions">
    <a class="btn btn-primary" href="inscription.html?formation=${encodeURIComponent(course.id)}">S'inscrire maintenant</a>
  </p>
`;

const courseOption = (course) =>
  `<option value="${escapeHtml(course.id)}"${course.available ? "" : " disabled"}>${escapeHtml(course.title)} (${escapeHtml(course.level)}, ${escapeHtml(course.price)} €)${course.available ? "" : " - complet"}</option>`;

// selects : nom du filtre -> [champ de l'élément filtré, liste d'options dans la réponse de l'API]
const CATALOGS = [
  {
    prefix: "project",
    label: "les projets",
    noun: "projet",
    searchFields: ["title", "client", "description"],
    selects: { tech: ["technologies", "technologies"], category: ["category", "categories"] },
    card: projectCard,
    details: projectDetails,
  },
  {
    prefix: "course",
    label: "les formations",
    noun: "formation",
    searchFields: ["title", "description", "instructor"],
    selects: {
      category: ["category", "categories"],
      level: ["level", "levels"],
      tech: ["technologies", "technologies"],
    },
    card: courseCard,
    details: courseDetails,
  },
];

const initCatalog = ({ prefix, label, noun, searchFields, selects, card, details }) => {
  const grid = $(`#${prefix}-grid`);
  if (!grid) return;

  const key = `${prefix}s`;
  const search = $(`#${prefix}-search`);
  const empty = $(`#${prefix}-empty`);
  const count = $(`#${prefix}-count`);
  const filters = Object.entries(selects).map(([name, [field, list]]) => ({
    select: $(`#${prefix}-${name}`),
    field,
    list,
  }));

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const items = store[key].filter(
      (item) =>
        searchFields.map((field) => item[field]).join(" ").toLowerCase().includes(query) &&
        filters.every(({ select, field }) => !select.value || [].concat(item[field]).includes(select.value)),
    );

    grid.innerHTML = items.map(card).join("");
    show(empty, items.length === 0);
    show(count, true);
    count.textContent = `${plural(items.length, noun)} sur ${store[key].length}`;
  };

  search.addEventListener("input", debounce(render));
  filters.forEach(({ select }) => select.addEventListener("change", render));
  // "reset" est émis avant la remise à zéro des champs : on attend avant de re-filtrer
  $(`#${prefix}-filters`).addEventListener("reset", () => setTimeout(render));

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;

    const item = store[key].find((entry) => String(entry.id) === button.dataset.id);
    $(`#${prefix}-modal-title`).textContent = item.title;
    $(`#${prefix}-modal-body`).innerHTML = details(item);
    openModal($(`#${prefix}-modal`));
  });

  loadData({
    file: `${key}.json`,
    label,
    loader: $(`#${prefix}-loader`),
    errorBox: $(`#${prefix}-error`),
    onSuccess: (data) => {
      store[key] = data[key];
      filters.forEach(({ select, list }) => {
        select.innerHTML += optionsOf(data[list]);
      });
      render();
    },
  });
};

const minLength = (length, message) => (value) =>
  value.trim().length >= length ? "" : message;

const VALIDATORS = {
  firstname: minLength(2, "Le prénom doit contenir au moins 2 caractères."),
  lastname: minLength(2, "Le nom doit contenir au moins 2 caractères."),
  email: (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? ""
      : "Adresse e-mail invalide (exemple : prenom.nom@exemple.fr).",
  // format international : "+" suivi de 8 à 15 chiffres, séparateurs ignorés
  phone: (value) =>
    /^\+[0-9]{8,15}$/.test(value.replace(/[\s.-]/g, ""))
      ? ""
      : "Numéro au format international attendu (exemple : +33 6 12 34 56 78).",
  course: (value) => (value ? "" : "Choisissez une formation."),
  level: (value) => (value ? "" : "Indiquez votre niveau."),
  motivation: (value) =>
    value.trim().length >= MOTIVATION_MIN_LENGTH
      ? ""
      : `Votre motivation doit contenir au moins ${MOTIVATION_MIN_LENGTH} caractères (actuellement ${value.trim().length}).`,
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
    counter.textContent = `${motivation.value.trim().length} / ${MOTIVATION_MIN_LENGTH} caractères minimum`;
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
    field.addEventListener("input", () => validate(field));
  });

  motivation.addEventListener("input", updateCounter);
  // même contrainte que pour les filtres : l'état visuel doit être réinitialisé après le reset natif
  form.addEventListener("reset", () => setTimeout(resetStates));

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const invalidFields = fields.filter((field) => !validate(field));
    if (invalidFields.length) {
      globalError.textContent = `Le formulaire comporte ${plural(invalidFields.length, "champ")} à corriger.`;
      show(globalError, true);
      invalidFields[0].focus();
      return;
    }

    const course = store.courses.find((item) => String(item.id) === courseSelect.value);
    $("#success-message").textContent = `Merci ${form.elements.firstname.value.trim()}, votre inscription à la formation « ${course.title} » est enregistrée.`;
    openModal($("#success-modal"));

    form.reset();
  });

  updateCounter();

  loadData({
    file: "courses.json",
    label: "la liste des formations",
    errorBox: $("#course-load-error"),
    onSuccess: ({ courses }) => {
      store.courses = courses;
      courseSelect.innerHTML =
        '<option value="">Sélectionnez une formation</option>' + courses.map(courseOption).join("");

      const requestedId = new URLSearchParams(location.search).get("formation");
      if (requestedId) courseSelect.value = requestedId;
    },
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initModals();
  CATALOGS.forEach(initCatalog);
  initSignupForm();
});
