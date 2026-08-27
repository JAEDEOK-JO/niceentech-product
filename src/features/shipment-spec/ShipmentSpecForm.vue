<script setup>
import niceentechLogoUrl from './assets/niceentech-logo.png?url'
import {
  SHIPMENT_SPEC_COMPANY_ADDRESS,
  SHIPMENT_SPEC_COMPANY_NAME,
  SHIPMENT_SPEC_FORM_ROWS,
} from './shipmentSpecFormFields'

defineProps({
  form: { type: Object, required: true },
  landscape: { type: Boolean, default: false },
})
</script>

<template>
  <article class="shipment-spec-sheet" :class="{ 'is-landscape': landscape }">
    <header class="sheet-header">
      <h1 class="sheet-title">출 하 명 세 서</h1>
      <p class="sheet-address">{{ SHIPMENT_SPEC_COMPANY_ADDRESS }}</p>
    </header>

    <table class="sheet-table">
      <colgroup>
        <col class="label-col" />
        <col />
      </colgroup>
      <tbody>
        <tr
          v-for="row in SHIPMENT_SPEC_FORM_ROWS"
          :key="row.key"
          :class="{
            'area-row': row.key === 'area',
            'drawing-row': row.key === 'drawing',
          }"
        >
          <th>{{ row.label }}</th>
          <td>{{ form[row.key] }}</td>
        </tr>
        <tr class="remarks-row">
          <th>특 이 사 항</th>
          <td>{{ form.remarks }}</td>
        </tr>
      </tbody>
    </table>

    <footer class="sheet-footer">
      <img :src="niceentechLogoUrl" alt="" class="sheet-logo" />
      <span class="sheet-company">{{ SHIPMENT_SPEC_COMPANY_NAME }}</span>
    </footer>
  </article>
</template>

<style src="./shipmentSpecForm.css"></style>
