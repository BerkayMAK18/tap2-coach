import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/aufgaben/$id")({ beforeLoad: () => { throw redirect({to:"/lernplan",replace:true}); } });
