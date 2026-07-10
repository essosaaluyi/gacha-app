"use client";

import { useState } from "react";

export default function SupportContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="trust-support-success">
        Thanks. Your support request has been received. If a reply is needed,
        we will contact you using the email address provided.
      </div>
    );
  }

  return (
    <form
      className="trust-support-form"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <h2>Contact Support</h2>
      <p>
        Use this form for login issues, lost points, reward issues, battle bugs,
        guest save problems, privacy requests, and legal questions.
      </p>

      <div className="trust-support-categories" aria-label="Support categories">
        {[
          "Login issue",
          "Lost points",
          "Reward issue",
          "Battle bug",
          "Guest save problem",
          "Privacy request",
          "Terms/legal question",
          "Other",
        ].map(
          (category) => (
            <button key={category} type="button">
              {category}
            </button>
          )
        )}
      </div>

      <div className="trust-form-grid">
        <label>
          <span>Email address</span>
          <input
            placeholder="you@example.com"
            type="email"
          />
        </label>

        <label>
          <span>Account ID or guest ID, if known</span>
          <input placeholder="Account ID, guest ID, or unknown" type="text" />
        </label>

        <label>
          <span>Device and browser</span>
          <input placeholder="Windows Chrome, iPhone Safari, etc." type="text" />
        </label>

        <label>
          <span>Date/time of issue</span>
          <input placeholder="Approximate date and time" type="text" />
        </label>

        <label>
          <span>Issue category</span>
          <select>
            <option>Login issue</option>
            <option>Lost points</option>
            <option>Reward issue</option>
            <option>Battle bug</option>
            <option>Guest save problem</option>
            <option>Privacy request</option>
            <option>Terms/legal question</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          <span>Message</span>
          <textarea
            placeholder="Describe what happened, what you expected, and what happened right before the issue."
          />
        </label>
      </div>

      <button className="trust-info-button trust-info-button-primary">
        Send support request
      </button>
    </form>
  );
}
