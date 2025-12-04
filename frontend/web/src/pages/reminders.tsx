import React from "react";

import Layout from "../components/Layout";
import ReminderList, { ReminderListProps } from "../components/ReminderList";

const reminders: ReminderListProps["reminders"] = [
  {
    id: "1",
    title: "Позвонить родителям",
    emoji: "📞",
    description: "Коротко обсудить планы на выходные и поделиться новостями.",
    date: "сегодня",
    time: "20:00",
    channels: ["Push", "Telegram"],
    tags: ["семья", "вечер"],
    category: "Личное",
    priority: 3,
    status: "scheduled",
    progress: 10,
  },
  {
    id: "2",
    title: "Напомнить о встрече",
    emoji: "👥",
    description: "Слот на демо с командой продуктов. Отправить за 1 час до начала.",
    date: "21 дек.",
    time: "14:00",
    channels: ["Email", "Calendar"],
    tags: ["встреча", "добавить ссылку"],
    category: "Работа",
    priority: 4,
    status: "snoozed",
    progress: 45,
  },
  {
    id: "3",
    title: "Поставить будильник на ранний вылет",
    emoji: "✈️",
    description: "Забронировать такси и проверить посадочный талон вечером.",
    date: "22 дек.",
    time: "05:40",
    channels: ["Push"],
    tags: ["путешествие", "сон"],
    category: "Личное",
    priority: 5,
    status: "sent",
    progress: 100,
  },
];

const RemindersPage = () => (
  <Layout>
    <h1 style={{ margin: "4px 0", letterSpacing: -0.02 }}>Напоминания</h1>
    <p style={{ marginTop: 0, color: "#9fb2d9" }}>Все каналы и статусы в одной карточке.</p>
    <ReminderList reminders={reminders} />
  </Layout>
);

export default RemindersPage;
