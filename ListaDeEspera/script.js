const endpoint = document.querySelector('meta[name="waitlist-endpoint"]')?.content.trim() || "";
const form = document.querySelector("#waitlist-form");
const submitButton = form?.querySelector(".submit-button");
const formStatus = form?.querySelector(".form-status");

document.addEventListener("pointermove", (event) => {
  document.documentElement.style.setProperty("--mouse-x", `${event.clientX}px`);
  document.documentElement.style.setProperty("--mouse-y", `${event.clientY}px`);
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    observer.unobserve(entry.target);
  });
}, { threshold: 0.14 });

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    const target = Number(element.dataset.count || 0);
    const startedAt = performance.now();
    const duration = 850;
    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObserver.unobserve(element);
  });
}, { threshold: 0.7 });

document.querySelectorAll("[data-count]").forEach((element) => countObserver.observe(element));

function showStatus(message, error = false) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.toggle("error", error);
  formStatus.classList.add("visible");
}

function validateField(input) {
  const row = input.closest(".form-row");
  if (!row) return input.checkValidity();
  const error = row.querySelector(".field-error");
  const valid = input.checkValidity();
  row.classList.toggle("invalid", !valid);
  if (error) error.textContent = valid ? "" : input.type === "email" ? "Digite um e-mail válido." : "Preencha este campo.";
  return valid;
}

form?.querySelectorAll("input[required]").forEach((input) => {
  input.addEventListener("blur", () => validateField(input));
  input.addEventListener("input", () => {
    if (input.closest(".form-row")?.classList.contains("invalid")) validateField(input);
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const required = [...form.querySelectorAll("input[required]")];
  const fieldsValid = required.filter((input) => input.type !== "checkbox").every(validateField);
  const consent = form.querySelector('input[name="consent"]');
  if (!fieldsValid || !consent?.checked) {
    showStatus(consent?.checked ? "Revise os campos destacados." : "Confirme que deseja receber as novidades da CrewOS.", true);
    return;
  }

  const values = Object.fromEntries(new FormData(form).entries());
  const payload = { name: values.name, email: values.email, company: values.company || "", role: values.role || "", source: "lista-de-espera", createdAt: new Date().toISOString() };
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Entrando na lista...";

  try {
    if (!endpoint) {
      localStorage.setItem("crewos-waitlist-preview", JSON.stringify(payload));
      showStatus("Cadastro validado! A página está em modo de prévia; conecte o endpoint antes da divulgação para receber inscrições reais.");
    } else {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`O servidor respondeu ${response.status}`);
      form.reset();
      showStatus("Você entrou na lista! Em breve enviaremos novidades e os primeiros convites.");
    }
  } catch (error) {
    showStatus("Não conseguimos concluir agora. Tente novamente em alguns instantes.", true);
    console.error("Falha no cadastro da lista de espera", error);
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Quero acompanhar de perto";
  }
});
