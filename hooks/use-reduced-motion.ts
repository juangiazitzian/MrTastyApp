"use client";
import {useEffect,useState} from 'react';
export function useReducedMotion(){const [reduced,setReduced]=useState(false);useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');setReduced(media.matches);const update=()=>setReduced(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);return reduced}
