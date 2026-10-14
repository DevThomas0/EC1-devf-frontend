"use strict";

const API_URL = "https://webcraft-api.vercel.app/data/";
const MOTIVATION_MIN_LENGTH = 50;

// Stockage global des données
const store = { projects: [], courses: [] };
// let debugMode = false;


/* ---------- Utilitaires ---------- */

const $ = (selector, scope = document) => scope.querySelector(selector);

const $$ = (selector) => [...document.querySelectorAll(selector)];

const show = (element, visible) => {
  element.hidden = !visible;
};

const plural = (count, noun) => `${count} ${noun}${count > 1 ? "s" : ""}`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeUrl = (url) => (/^https?:\/\//i.test(url) ? url : "#");

const debounce = (callback, delay = 250) => {
  let timer;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(callback, delay);
  };
};


/* ---------- Fragments HTML ---------- */

const itemsOf = (items, className = "") =>
  items
    .map((item) => `<li class="${className}">${escapeHtml(item)}</li>`)
    .join("");

const badgesOf = (items) =>
  `<ul class="badges">${itemsOf(items, "badge")}</ul>`;

const infoOf = (rows) => {
  const entries = rows
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");

  return `<dl class="info">${entries}</dl>`;
};

const optionsOf = (values) =>
  values
    .map((value) => `<option>${escapeHtml(value)}</option>`)
    .join("");


/* ---------- Chargement des API ---------- */

const loadData = async ({ file, label, loader, errorBox, onSuccess }) => {
  if (loader) show(loader, true);
  show(errorBox, false);

  try {
    // console.log("Chargement des données depuis :", API_URL + file);
    const response = await fetch(API_URL + file);

    if (!response.ok) throw new Error(`réponse HTTP ${response.status}`);

    const data = await response.json();
    console.log(`Données reçues pour ${file} :`, data);
    onSuccess(data);
  } catch (error) {
    console.error(`Erreur de chargement (${file}) :`, error);
    errorBox.textContent = `Impossible de charger ${label}. Vérifiez votre connexion puis rechargez la page (${error.message}).`;
    show(errorBox, true);
  } finally {
    if (loader) show(loader, false);
  }
};


/* ---------- Modales et navigation ---------- */

let lastFocused = null;

const setBackgroundInert = (isInert) => {
  $$("body > :not(.modal):not(script)").forEach((element) => {
    element.inert = isInert;
  });
};

const openModal = (modal) => {
  lastFocused = document.activeElement;

  show(modal, true);
  setBackgroundInert(true);
  document.body.classList.add("has-modal");
  $(".modal-close", modal).focus();
  // console.log("Modale ouverte :", modal.id);
};

const closeModal = (modal) => {
  if (modal.hidden) return;

  show(modal, false);
  setBackgroundInert(false);
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
    // console.log("Menu mobile toggle :", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;

    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  });
};


/* ---------- Gabarits des projets ---------- */

const projectCard = (project) => `
  <article class="card">
    <img src="${escapeHtml(project.image)}"
         alt="Aperçu du projet ${escapeHtml(project.title)}"
         loading="lazy">

    <div class="card-body">
      <h3>${escapeHtml(project.title)}</h3>
      <p>Client : ${escapeHtml(project.client)}</p>
      <p class="card-meta">
        ${escapeHtml(project.category)} &middot;
        ${escapeHtml(project.year)} &middot;
        ${escapeHtml(project.duration)}
      </p>

      ${badgesOf(project.technologies)}

      <p class="card-actions">
        <button class="btn btn-primary" type="button" data-id="${escapeHtml(project.id)}">
          Voir détails
        </button>
      </p>
    </div>
  </article>
`;

const projectDetails = (project) => `
  <img src="${escapeHtml(project.image)}"
       alt="Aperçu du projet ${escapeHtml(project.title)}">

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
    <a class="btn btn-primary"
       href="${escapeHtml(safeUrl(project.url))}"
       target="_blank"
       rel="noopener">Visiter le site</a>
  </p>
`;


/* ---------- Gabarits des formations ---------- */

const enrollButton = (course, label) =>
  course.available
    ? `<a class="btn btn-primary" href="inscription.html?formation=${encodeURIComponent(course.id)}">${label}</a>`
    : `<button class="btn" type="button" disabled>${label}</button>`;

const courseCard = (course) => `
  <article class="card">
    <img src="${escapeHtml(course.image)}"
         alt="Illustration de la formation ${escapeHtml(course.title)}"
         loading="lazy">

    <div class="card-body">
      <h3>${escapeHtml(course.title)}</h3>

      <ul class="badges">
        <li class="badge">${escapeHtml(course.category)}</li>
        <li class="badge">${escapeHtml(course.level)}</li>
        <li class="badge ${course.available ? "badge-strong" : "badge-full"}">
          ${course.available ? "Disponible" : "Complet"}
        </li>
      </ul>

      <p class="card-meta">
        ${escapeHtml(course.duration)} &middot;
        ★ ${escapeHtml(course.rating)} / 5 &middot;
        ${escapeHtml(course.students)} étudiants
      </p>
      <p class="card-price">${escapeHtml(course.price)} €</p>

      ${badgesOf(course.technologies)}

      <p class="card-actions">
        <button class="btn" type="button" data-id="${escapeHtml(course.id)}">
          Voir détails
        </button>
        ${enrollButton(course, "S'inscrire")}
      </p>
    </div>
  </article>
`;

const courseDetails = (course) => `
  <img src="${escapeHtml(course.image)}"
       alt="Illustration de la formation ${escapeHtml(course.title)}">

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
    ${enrollButton(course, "S'inscrire maintenant")}
  </p>
`;

const courseOption = (course) => {
  const disabled = course.available ? "" : " disabled";
  const suffix = course.available ? "" : " - complet";
  const title = escapeHtml(course.title);
  const level = escapeHtml(course.level);
  const price = escapeHtml(course.price);

  return `<option value="${escapeHtml(course.id)}"${disabled}>${title} (${level}, ${price} €)${suffix}</option>`;
};


/* ---------- Catalogues (projets et formations) ---------- */

// Configuration des filtres et correspondances avec les champs de l'API
const CATALOGS = [
  {
    prefix: "project",
    label: "les projets",
    noun: "projet",
    searchFields: ["title", "client", "description"],
    selects: {
      tech: ["technologies", "technologies"],
      category: ["category", "categories"],
    },
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

  const matchesSearch = (item, query) =>
    searchFields
      .map((field) => item[field])
      .join(" ")
      .toLowerCase()
      .includes(query);

  const matchesFilters = (item) =>
    filters.every(
      ({ select, field }) => !select.value || [].concat(item[field]).includes(select.value),
    );

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const items = store[key].filter((item) => matchesSearch(item, query) && matchesFilters(item));

    // console.log(`Rendu ${prefix} : ${items.length} élément(s)`);
    grid.innerHTML = items.map(card).join("");
    show(empty, items.length === 0);
    show(count, true);
    count.textContent = `${plural(items.length, noun)} sur ${store[key].length}`;
  };

  search.addEventListener("input", debounce(render));
  filters.forEach(({ select }) => select.addEventListener("change", render));

  // Petit délai pour laisser le reset vider les inputs avant de relancer l'affichage
  $(`#${prefix}-filters`).addEventListener("reset", () => {
    // console.log(`Reset des filtres pour ${prefix}`);
    setTimeout(render, 10);
  });

  // TODO: ajouter une pagination ou lazy loading si la liste devient trop longue

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");

    if (!button) return;

    const item = store[key].find((entry) => String(entry.id) === button.dataset.id);
    console.log(`Détails demandés (${prefix}) :`, item?.title);

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


/* ---------- Formulaire d'inscription ---------- */

const minLength = (length, message) => (value) =>
  value.trim().length >= length ? "" : message;

const VALIDATORS = {
  firstname: minLength(2, "Le prénom doit contenir au moins 2 caractères."),

  lastname: minLength(2, "Le nom doit contenir au moins 2 caractères."),

  email: (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? ""
      : "Adresse e-mail invalide (exemple : prenom.nom@exemple.fr).",

  // Format international requis (ex: +33 6 12 34 56 78)
  phone: (value) =>
    /^\+[0-9]{8,15}$/.test(value.replace(/[\s.-]/g, ""))
      ? ""
      : "Numéro au format international attendu (exemple : +33 6 12 34 56 78).",

  course: (value) => {
    if (!value) return "Choisissez une formation.";
    const found = store.courses.find((item) => String(item.id) === value);
    if (found && !found.available) return "Cette formation est complète.";
    return "";
  },

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
    const isValid = message === "";
    const errorBox = $(`#${field.id}-error`);

    field.classList.toggle("is-invalid", !isValid);
    field.classList.toggle("is-valid", isValid && field.value !== "");
    errorBox.textContent = message;
    show(errorBox, !isValid);

    return isValid;
  };

  const updateCounter = () => {
    const length = motivation.value.trim().length;

    counter.textContent = `${length} / ${MOTIVATION_MIN_LENGTH} caractères minimum`;
  };

  const resetStates = () => {
    // console.log("Réinitialisation visuelle du formulaire");
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

  // Réinitialisation des classes d'erreur après le reset du formulaire
  form.addEventListener("reset", () => setTimeout(resetStates, 10));

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const invalidFields = fields.filter((field) => !validate(field));

    if (invalidFields.length) {
      console.warn("Validation échouée, champs en erreur :", invalidFields.map((f) => f.name));
      globalError.textContent = `Le formulaire comporte ${plural(invalidFields.length, "champ")} à corriger.`;
      show(globalError, true);
      invalidFields[0].focus();
      return;
    }

    const firstname = form.elements.firstname.value.trim();
    const course = store.courses.find((item) => String(item.id) === courseSelect.value);

    console.log("Inscription soumise avec succès :", {
      nom: form.elements.lastname.value,
      prenom: firstname,
      formation: course?.title,
    });

    $("#success-message").textContent = `Merci ${firstname}, votre inscription à la formation « ${course.title} » est enregistrée.`;
    openModal($("#success-modal"));

    form.reset();
  });

  updateCounter();

  loadData({
    file: "courses.json",
    label: "la liste des formations",
    loader: $("#course-loader"),
    errorBox: $("#course-load-error"),
    onSuccess: ({ courses }) => {
      store.courses = courses;

      courseSelect.innerHTML =
        '<option value="">Sélectionnez une formation</option>' +
        courses.map(courseOption).join("");

      const requestedId = new URLSearchParams(location.search).get("formation");
      const requestedCourse = courses.find((course) => String(course.id) === requestedId);

      // console.log("Formation demandée par URL :", requestedId);
      if (requestedCourse?.available) {
        courseSelect.value = requestedId;
      }
    },
  });
};


/* ---------- Démarrage ---------- */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initialisation du portail WebCraft Solutions...");
  initNavigation();
  initModals();
  CATALOGS.forEach(initCatalog);
  initSignupForm();
  // TODO: vérifier compatibilité avec les anciens navigateurs
});
