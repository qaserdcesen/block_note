import React from "react";

import Layout from "../components/Layout";

const SettingsPage = () => (
  <Layout>
    <h1>Настройки</h1>
    <ul>
      <li>Профиль пользователя</li>
      <li>Каналы уведомлений (push/email/Telegram)</li>
      <li>Интеграции (TODO)</li>
    </ul>
  </Layout>
);

export default SettingsPage;
