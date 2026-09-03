<script setup lang="ts">
import logoUrl from '../../assets/logo.png?url'
import stampUrl from '../../assets/stamp.png?url'
import type { NoticeCertificateModel } from '../../utils/print/notice-certificate'

defineProps<{
  model: NoticeCertificateModel
}>()
</script>

<template>
  <article class="notice-sheet">
    <header class="notice-header">
      <h1>생산제품 성능검사 인증 리스트</h1>
      <div class="notice-meta">
        <p>현장명: {{ model.place }}</p>
        <p>공정명: {{ model.area }}</p>
      </div>
    </header>

    <table class="notice-table">
      <colgroup>
        <col class="col-receipt" />
        <col class="col-cert" />
        <col class="col-lot" />
        <col class="col-size" />
        <col class="col-qty" />
        <col class="col-pass" />
      </colgroup>
      <thead>
        <tr>
          <th>접수번호</th>
          <th>인증번호</th>
          <th>로트번호</th>
          <th>호칭</th>
          <th>수량</th>
          <th>합격번호</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in model.qtyRows" :key="row.label">
          <td v-if="index === 0" class="cell-span" :rowspan="model.qtyRows.length">{{ model.receiptNum }}</td>
          <td v-if="index === 0" class="cell-span" :rowspan="model.qtyRows.length">{{ model.certification }}</td>
          <td v-if="index === 0" class="cell-span" :rowspan="model.qtyRows.length">{{ model.lotNumH }}</td>
          <td class="cell-size">{{ row.label }}</td>
          <td class="cell-qty">{{ row.qty }}</td>
          <td v-if="index === 0" class="cell-span" :rowspan="model.qtyRows.length">{{ model.passNumber }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4">합계</td>
          <td>{{ model.totalH }}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <p class="notice-ack">상기 제품은 생산제품 성능검사 처리결과에 의한 종합판정에 합격한 제품임을 인정함</p>

    <div class="notice-sign">
      <div class="notice-sign-inner">
        <img class="notice-stamp" :src="stampUrl" alt="" />
        <div class="notice-company">
          <img class="notice-logo" :src="logoUrl" alt="" />
          <div class="notice-company-text">
            <p>검사일자 : {{ model.testDate }}</p>
            <p>주식회사 나이스엔테크</p>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
