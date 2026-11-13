import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/aufgaben/")({ beforeLoad: () => { throw redirect({to:"/lernplan",replace:true}); } });
