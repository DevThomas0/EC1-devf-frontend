"use strict";

const API_URLS = {
  projects: "https://webcraft-api.vercel.app/data/projects.json",
  courses: "https://webcraft-api.vercel.app/data/courses.json",
};

const store = {
  projects: [],
  courses: [],
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];

/**
 * Neutralise les caracteres sensibles avant toute injection HTML.
 * @param {*} value valeur brute issue de l'API
 * @returns {string} chaine sure
 */
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Retarde l'execution d'une fonction : evite de refiltrer a chaque frappe.
 * @param {Function} callback fonction a differer
 * @param {number} delay delai en millisecondes
 * @returns {Function} fonction debouncee
 */
const debounce = (callback, delay = 250) => {
  let timerId = null;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => callback(...args), delay);
  };
};

/** Affiche ou masque un element via l'attribut hidden. */
const setVisible = (element, isVisible) => {
  if (element) {
    element.hidden = !isVisible;
  }
};

/** Normalise une chaine pour une recherche insensible a la casse et aux accents. */
const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Remplit une liste deroulante a partir d'un tableau de valeurs. */
const fillSelect = (select, values) => {
  if (!select) {
    return;
  }
  const options = values
    .map(
      (value) =>
        `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`,
    )
    .join("");
  select.insertAdjacentHTML("beforeend", options);
};

/** Construit la liste de badges de technologies. */
const renderBadges = (technologies = []) =>
  technologies
    .map((tech) => `<li class="badge">${escapeHtml(tech)}</li>`)
    .join("");

/* ============ 2. NAVIGATION (MENU MOBILE) ============ */

/**
 * Gere l'ouverture / fermeture du menu burger en mobile.
 * L'attribut aria-expanded est tenu a jour pour les lecteurs d'ecran.
 */
const initNavigation = () => {
  const toggle = $(".nav-toggle");
  const nav = $("#main-nav");

  if (!toggle || !nav) {
    return;
  }

  const closeNav = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Ouvrir le menu de navigation");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation",
    );
  });

  // Le menu se referme apres un clic sur un lien (navigation par ancre).
  $$(".nav-link", nav).forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  // La touche Echap referme egalement le menu.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      closeNav();
      toggle.focus();
    }
  });
};

/* ============ 3. COUCHE AJAX ============ */

/**
 * Telecharge et decode un flux JSON.
 * @param {string} url adresse de l'API
 * @returns {Promise<Object>} donnees decodees
 * @throws {Error} si la reponse HTTP n'est pas valide
 */
const fetchJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Reponse HTTP ${response.status} (${response.statusText})`);
  }

  return response.json();
};

/**
 * Charge une API en pilotant les trois etats de l'interface :
 * loader CSS pendant la requete, message d'erreur en cas d'echec,
 * rendu des donnees en cas de succes.
 * @param {Object} config parametres de la section
 */
const loadSection = async ({ url, loader, errorBox, onSuccess, label }) => {
  setVisible(loader, true);
  setVisible(errorBox, false);

  try {
    const data = await fetchJson(url);
    onSuccess(data);
  } catch (error) {
    if (errorBox) {
      errorBox.textContent =
        `Impossible de charger ${label}. Verifiez votre connexion puis rechargez la page. ` +
        `(Detail technique : ${error.message})`;
    }
    setVisible(errorBox, true);
  } finally {
    setVisible(loader, false);
  }
};

/* ============ 4. FENETRES MODALES REUTILISABLES ============ */

/** Element ayant le focus avant l'ouverture, pour le restituer a la fermeture. */
let lastFocusedElement = null;

/** Selecteur des elements focusables presents dans une modale. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Ouvre une modale : affiche le dialogue, bloque le defilement
 * et place le focus sur le premier element interactif.
 * @param {HTMLElement} modal conteneur de la modale
 */
const openModal = (modal) => {
  if (!modal) {
    return;
  }

  lastFocusedElement = document.activeElement;
  setVisible(modal, true);
  document.body.classList.add("has-modal");

  const firstFocusable = $(FOCUSABLE, modal);
  if (firstFocusable) {
    firstFocusable.focus();
  }
};

/**
 * Ferme une modale et rend le focus a l'element declencheur.
 * @param {HTMLElement} modal conteneur de la modale
 */
const closeModal = (modal) => {
  if (!modal || modal.hidden) {
    return;
  }

  setVisible(modal, false);
  document.body.classList.remove("has-modal");

  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
};

/** Ferme toutes les modales ouvertes de la page. */
const closeAllModals = () => {
  $$(".modal").forEach((modal) => closeModal(modal));
};

/**
 * Branche les trois modes de fermeture exiges :
 * bouton de fermeture, clic sur l'arriere-plan et touche Echap.
 * Le focus reste piege dans la modale (navigation clavier).
 */
const initModals = () => {
  const modals = $$(".modal");

  if (modals.length === 0) {
    return;
  }

  modals.forEach((modal) => {
    // Bouton « x » et clic sur l'arriere-plan.
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) {
        closeModal(modal);
      }
    });

    // Piege a focus : la tabulation boucle dans la modale.
    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") {
        return;
      }

      const focusables = $$(FOCUSABLE, modal).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusables.length === 0) {
        return;
      }

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

  // Touche Echap : fermeture globale.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
};

/* ============ 5. SECTION PROJETS (API 1) ============ */

/**
 * Construit la carte HTML d'un projet.
 * @param {Object} project projet issu de l'API 1
 * @returns {string} balisage de la carte
 */
const projectCardTemplate = (project) => `
  <article class="card">
    <div class="card-media">
      <img src="${escapeHtml(project.image)}"
           alt="Apercu du projet ${escapeHtml(project.title)}"
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
      <ul class="badge-list">${renderBadges(project.technologies)}</ul>
      <div class="card-actions">
        <button class="btn btn-primary" type="button"
                data-project-details="${escapeHtml(project.id)}">
          Voir details
        </button>
      </div>
    </div>
  </article>
`;

/**
 * Construit le contenu de la modale d'un projet.
 * @param {Object} project projet issu de l'API 1
 * @returns {string} balisage du detail
 */
const projectModalTemplate = (project) => `
  <div class="modal-media">
    <img src="${escapeHtml(project.image)}"
         alt="Apercu du projet ${escapeHtml(project.title)}"
         width="800" height="450">
  </div>
  <p>${escapeHtml(project.description)}</p>
  <dl class="info-grid">
    <div>
      <dt>Client</dt>
      <dd>${escapeHtml(project.client)}</dd>
    </div>
    <div>
      <dt>Categorie</dt>
      <dd>${escapeHtml(project.category)}</dd>
    </div>
    <div>
      <dt>Annee</dt>
      <dd>${escapeHtml(project.year)}</dd>
    </div>
    <div>
      <dt>Duree</dt>
      <dd>${escapeHtml(project.duration)}</dd>
    </div>
  </dl>
  <h3>Technologies utilisees</h3>
  <ul class="badge-list">${renderBadges(project.technologies)}</ul>
  <h3>Fonctionnalites cles</h3>
  <ul class="check-list">
    ${(project.features ?? []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
  </ul>
  <div class="modal-actions">
    <a class="btn btn-primary" href="${escapeHtml(project.url)}" target="_blank" rel="noopener">
      Visiter le site du projet
    </a>
  </div>
`;

/**
 * Initialise la section Projets : chargement de l'API 1,
 * remplissage des filtres, rendu de la grille et ouverture de la modale.
 */
const initProjects = () => {
  const grid = $("#project-grid");

  if (!grid) {
    return;
  }

  const loader = $("#project-loader");
  const errorBox = $("#project-error");
  const emptyBox = $("#project-empty");
  const countBox = $("#project-count");
  const searchInput = $("#project-search");
  const techSelect = $("#project-tech");
  const categorySelect = $("#project-category");
  const filtersForm = $("#project-filters");
  const modal = $("#project-modal");
  const modalTitle = $("#project-modal-title");
  const modalBody = $("#project-modal-body");

  /** Applique les trois filtres combinables puis met a jour la grille. */
  const applyFilters = () => {
    const query = normalize(searchInput.value.trim());
    const tech = techSelect.value;
    const category = categorySelect.value;

    const results = store.projects.filter((project) => {
      const haystack = normalize(
        [
          project.title,
          project.client,
          project.description,
          project.category,
          ...(project.technologies ?? []),
        ].join(" "),
      );

      const matchesQuery = query === "" || haystack.includes(query);
      const matchesTech =
        tech === "" || (project.technologies ?? []).includes(tech);
      const matchesCategory = category === "" || project.category === category;

      return matchesQuery && matchesTech && matchesCategory;
    });

    grid.innerHTML = results.map(projectCardTemplate).join("");
    setVisible(emptyBox, results.length === 0);
    setVisible(countBox, true);
    countBox.textContent = `${results.length} projet${results.length > 1 ? "s" : ""} sur ${store.projects.length}`;
  };

  // Recherche en temps reel : debounce de 250 ms (performance C5).
  searchInput.addEventListener("input", debounce(applyFilters, 250));
  techSelect.addEventListener("change", applyFilters);
  categorySelect.addEventListener("change", applyFilters);

  // Reinitialisation : le navigateur vide les champs, on refiltre ensuite.
  filtersForm.addEventListener("reset", () => {
    setTimeout(applyFilters, 0);
  });

  // Ouverture de la modale depuis une carte (delegation d'evenement).
  grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-project-details]");
    if (!trigger) {
      return;
    }

    const project = store.projects.find(
      (item) => String(item.id) === trigger.dataset.projectDetails,
    );
    if (!project) {
      return;
    }

    modalTitle.textContent = project.title;
    modalBody.innerHTML = projectModalTemplate(project);
    openModal(modal);
  });

  loadSection({
    url: API_URLS.projects,
    loader,
    errorBox,
    label: "les projets",
    onSuccess: (data) => {
      store.projects = data.projects ?? [];
      fillSelect(techSelect, data.technologies ?? []);
      fillSelect(categorySelect, data.categories ?? []);
      applyFilters();
    },
  });
};

/* ============ 6. SECTION FORMATIONS (API 2) ============ */

/**
 * Construit la carte HTML d'une formation.
 * @param {Object} course formation issue de l'API 2
 * @returns {string} balisage de la carte
 */
const courseCardTemplate = (course) => `
  <article class="card">
    <div class="card-media">
      <img src="${escapeHtml(course.image)}"
           alt="Illustration de la formation ${escapeHtml(course.title)}"
           loading="lazy" width="800" height="450">
      <span class="badge badge-category">${escapeHtml(course.category)}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(course.title)}</h3>
      <ul class="badge-list">
        <li class="badge badge-level">${escapeHtml(course.level)}</li>
        <li class="badge ${course.available ? "badge-available" : "badge-full"}">
          ${course.available ? "Disponible" : "Complet"}
        </li>
      </ul>
      <p class="card-meta">
        <span>${escapeHtml(course.duration)}</span>
        <span class="rating">
          <span class="rating-star" aria-hidden="true">&#9733;</span>
          ${escapeHtml(course.rating)} / 5
        </span>
        <span>${escapeHtml(course.students)} etudiants</span>
      </p>
      <p class="card-price">${escapeHtml(course.price)} &euro;</p>
      <ul class="badge-list">${renderBadges(course.technologies)}</ul>
      <div class="card-actions">
        <button class="btn btn-ghost" type="button"
                data-course-details="${escapeHtml(course.id)}">
          Voir details
        </button>
        <a class="btn btn-primary" href="inscription.html?formation=${escapeHtml(course.id)}">
          S'inscrire
        </a>
      </div>
    </div>
  </article>
`;

/**
 * Construit le contenu de la modale d'une formation.
 * @param {Object} course formation issue de l'API 2
 * @returns {string} balisage du detail
 */
const courseModalTemplate = (course) => `
  <div class="modal-media">
    <img src="${escapeHtml(course.image)}"
         alt="Illustration de la formation ${escapeHtml(course.title)}"
         width="800" height="450">
  </div>
  <ul class="badge-list">
    <li class="badge badge-category">${escapeHtml(course.category)}</li>
    <li class="badge badge-level">${escapeHtml(course.level)}</li>
    <li class="badge ${course.available ? "badge-available" : "badge-full"}">
      ${course.available ? "Disponible" : "Complet"}
    </li>
  </ul>
  <p>${escapeHtml(course.description)}</p>
  <dl class="info-grid">
    <div>
      <dt>Formateur</dt>
      <dd>${escapeHtml(course.instructor)}</dd>
    </div>
    <div>
      <dt>Duree</dt>
      <dd>${escapeHtml(course.duration)}</dd>
    </div>
    <div>
      <dt>Tarif</dt>
      <dd>${escapeHtml(course.price)} &euro;</dd>
    </div>
    <div>
      <dt>Note moyenne</dt>
      <dd><span class="rating-star" aria-hidden="true">&#9733;</span> ${escapeHtml(course.rating)} / 5</dd>
    </div>
    <div>
      <dt>Etudiants inscrits</dt>
      <dd>${escapeHtml(course.students)}</dd>
    </div>
    <div>
      <dt>Niveau requis</dt>
      <dd>${escapeHtml(course.level)}</dd>
    </div>
  </dl>
  <h3>Technologies abordees</h3>
  <ul class="badge-list">${renderBadges(course.technologies)}</ul>
  <h3>Modules du programme</h3>
  <ul class="check-list">
    ${(course.modules ?? []).map((module) => `<li>${escapeHtml(module)}</li>`).join("")}
  </ul>
  <div class="modal-actions">
    <a class="btn btn-accent" href="inscription.html?formation=${escapeHtml(course.id)}">
      S'inscrire maintenant
    </a>
  </div>
`;

const initCourses = () => {
  const grid = $("#course-grid");

  if (!grid) {
    return;
  }

  const loader = $("#course-loader");
  const errorBox = $("#course-error");
  const emptyBox = $("#course-empty");
  const countBox = $("#course-count");
  const searchInput = $("#course-search");
  const categorySelect = $("#course-category");
  const levelSelect = $("#course-level");
  const techSelect = $("#course-tech");
  const filtersForm = $("#course-filters");
  const modal = $("#course-modal");
  const modalTitle = $("#course-modal-title");
  const modalBody = $("#course-modal-body");

  const applyFilters = () => {
    const query = normalize(searchInput.value.trim());
    const category = categorySelect.value;
    const level = levelSelect.value;
    const tech = techSelect.value;

    const results = store.courses.filter((course) => {
      const haystack = normalize(
        [
          course.title,
          course.description,
          course.instructor,
          course.category,
          ...(course.technologies ?? []),
        ].join(" "),
      );

      return (
        (query === "" || haystack.includes(query)) &&
        (category === "" || course.category === category) &&
        (level === "" || course.level === level) &&
        (tech === "" || (course.technologies ?? []).includes(tech))
      );
    });

    grid.innerHTML = results.map(courseCardTemplate).join("");
    setVisible(emptyBox, results.length === 0);
    setVisible(countBox, true);
    countBox.textContent = `${results.length} formation${results.length > 1 ? "s" : ""} sur ${store.courses.length}`;
  };

  searchInput.addEventListener("input", debounce(applyFilters, 250));
  [categorySelect, levelSelect, techSelect].forEach((select) => {
    select.addEventListener("change", applyFilters);
  });

  filtersForm.addEventListener("reset", () => {
    setTimeout(applyFilters, 0);
  });

  grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-course-details]");
    if (!trigger) {
      return;
    }

    const course = store.courses.find(
      (item) => String(item.id) === trigger.dataset.courseDetails,
    );
    if (!course) {
      return;
    }

    modalTitle.textContent = course.title;
    modalBody.innerHTML = courseModalTemplate(course);
    openModal(modal);
  });

  loadSection({
    url: API_URLS.courses,
    loader,
    errorBox,
    label: "les formations",
    onSuccess: (data) => {
      store.courses = data.courses ?? [];
      fillSelect(categorySelect, data.categories ?? []);
      fillSelect(levelSelect, data.levels ?? []);
      fillSelect(techSelect, data.technologies ?? []);
      applyFilters();
    },
  });
};

/* ============ 7. POINT D'ENTREE ============ */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initModals();
  initProjects();
  initCourses();
});
