import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../services/auth';

function AppRoutes(){

const { session, loading } = useAuth();

const router = useRouter();
const segments = useSegments();

useEffect(()=>{

if(loading) return;

const estaEmAuth =
segments[0]==="login"
||
segments[0]==="cadastro";

if(!session && !estaEmAuth){

router.replace("/login");

}

if(session && estaEmAuth){

router.replace("/home");

}

},[
session,
loading
]);

return(
<Stack
screenOptions={{
headerShown:false
}}
/>
);

}

export default function Layout(){

return(

<AuthProvider>

<AppRoutes/>

</AuthProvider>

);

}